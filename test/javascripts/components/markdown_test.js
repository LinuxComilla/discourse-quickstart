/*global sanitizeHtml:true */

module("Discourse.Markdown", {
  setup: function() {
    Discourse.SiteSettings.traditional_markdown_linebreaks = false;
  }
});

var cooked = function(input, expected, text) {
  var result = Discourse.Markdown.cook(input, {mentionLookup: false, sanitize: true});
  equal(result, expected, text);
};

var cookedOptions = function(input, opts, expected, text) {
  equal(Discourse.Markdown.cook(input, opts), expected, text);
};

test("basic cooking", function() {
  cooked("hello", "<p>hello</p>", "surrounds text with paragraphs");
});

test("Line Breaks", function() {

  var input = "1\n2\n3";
  cooked(input, "<p>1<br>2<br>3</p>", "automatically handles trivial newlines");

  var traditionalOutput = "<p>1\n2\n3</p>";

  cookedOptions(input,
                {traditional_markdown_linebreaks: true},
                traditionalOutput,
                "It supports traditional markdown via an option");

  Discourse.SiteSettings.traditional_markdown_linebreaks = true;
  cooked(input, traditionalOutput, "It supports traditional markdown via a Site Setting");

});

test("Links", function() {

  cooked("EvilTrout: http://eviltrout.com",
         '<p>EvilTrout: <a href="http://eviltrout.com">http://eviltrout.com</a></p>',
         "autolinks a URL");

  cooked("Youtube: http://www.youtube.com/watch?v=1MrpeBRkM5A",
         '<p>Youtube: <a href="http://www.youtube.com/watch?v=1MrpeBRkM5A">http://www.youtube.com/watch?v=1MrpeBRkM5A</a></p>',
         "allows links to contain query params");

  cooked("Derpy: http://derp.com?__test=1",
         '<p>Derpy: <a href="http://derp.com?__test=1">http://derp.com?__test=1</a></p>',
         "works with double underscores in urls");

  cooked("Derpy: http://derp.com?_test_=1",
         '<p>Derpy: <a href="http://derp.com?_test_=1">http://derp.com?_test_=1</a></p>',
         "works with underscores in urls");

  cooked("Atwood: www.codinghorror.com",
         '<p>Atwood: <a href="http://www.codinghorror.com">www.codinghorror.com</a></p>',
         "autolinks something that begins with www");

  cooked("Atwood: http://www.codinghorror.com",
         '<p>Atwood: <a href="http://www.codinghorror.com">http://www.codinghorror.com</a></p>',
         "autolinks a URL with http://www");

  cooked("EvilTrout: http://eviltrout.com hello",
         '<p>EvilTrout: <a href="http://eviltrout.com">http://eviltrout.com</a> hello</p>',
         "autolinks with trailing text");

  cooked("here is [an example](http://twitter.com)",
         '<p>here is <a href="http://twitter.com">an example</a></p>',
         "supports markdown style links");

  cooked("Batman: http://en.wikipedia.org/wiki/The_Dark_Knight_(film)",
         '<p>Batman: <a href="http://en.wikipedia.org/wiki/The_Dark_Knight_(film)">http://en.wikipedia.org/wiki/The_Dark_Knight_(film)</a></p>',
         "autolinks a URL with parentheses (like Wikipedia)");

  cooked("Here's a tweet:\nhttps://twitter.com/evil_trout/status/345954894420787200",
         "<p>Here's a tweet:<br><a href=\"https://twitter.com/evil_trout/status/345954894420787200\" class=\"onebox\">https://twitter.com/evil_trout/status/345954894420787200</a></p>",
         "It doesn't strip the new line.");

  cooked("1. View @eviltrout's profile here: http://meta.discourse.org/users/eviltrout/activity\nnext line.",
        "<ol><li>View <span class=\"mention\">@eviltrout</span>'s profile here: <a href=\"http://meta.discourse.org/users/eviltrout/activity\">http://meta.discourse.org/users/eviltrout/activity</a><br>next line.</li></ol>",
        "allows autolinking within a list without inserting a paragraph.");


  cooked("[3]: http://eviltrout.com", "", "It doesn't autolink markdown link references");

  cooked("http://discourse.org and http://discourse.org/another_url and http://www.imdb.com/name/nm2225369",
         "<p><a href=\"http://discourse.org\">http://discourse.org</a> and " +
         "<a href=\"http://discourse.org/another_url\">http://discourse.org/another_url</a> and " +
         "<a href=\"http://www.imdb.com/name/nm2225369\">http://www.imdb.com/name/nm2225369</a></p>",
         'allows multiple links on one line');

});

test("Quotes", function() {

  cookedOptions("[quote=\"eviltrout, post: 1\"]\na quote\n\nsecond line\n[/quote]",
                { topicId: 2 },
                "<p><aside class=\"quote\" data-post=\"1\"><div class=\"title\"><div class=\"quote-controls\"></div>eviltrout said:</div><blockquote>\n" +
                "a quote<br/><br/>second line<br/></blockquote></aside></p>",
                "works with multiple lines");

  cookedOptions("1[quote=\"bob, post:1\"]my quote[/quote]2",
                { topicId: 2, lookupAvatar: function(name) { return "" + name; } },
                "<p>1</p>\n\n<p><aside class=\"quote\" data-post=\"1\"><div class=\"title\"><div class=\"quote-controls\"></div>bob\n" +
                "bob said:</div><blockquote>my quote</blockquote></aside></p>\n\n<p>2</p>",
                "handles quotes properly");

  cookedOptions("1[quote=\"bob, post:1\"]my quote[/quote]2",
                { topicId: 2, lookupAvatar: function(name) { } },
                "<p>1</p>\n\n<p><aside class=\"quote\" data-post=\"1\"><div class=\"title\"><div class=\"quote-controls\"></div>bob said:" +
                "</div><blockquote>my quote</blockquote></aside></p>\n\n<p>2</p>",
                "includes no avatar if none is found");
});

test("Mentions", function() {
  cookedOptions("Hello @sam", { mentionLookup: (function() { return true; }) },
                "<p>Hello <a class=\"mention\" href=\"/users/sam\">@sam</a></p>",
                "translates mentions to links");

  cooked("Hello @EvilTrout", "<p>Hello <span class=\"mention\">@EvilTrout</span></p>", "adds a mention class");
  cooked("robin@email.host", "<p>robin@email.host</p>", "won't add mention class to an email address");
  cooked("hanzo55@yahoo.com", "<p>hanzo55@yahoo.com</p>", "won't be affected by email addresses that have a number before the @ symbol");
  cooked("@EvilTrout yo", "<p><span class=\"mention\">@EvilTrout</span> yo</p>", "it handles mentions at the beginning of a string");
  cooked("yo\n@EvilTrout", "<p>yo<br><span class=\"mention\">@EvilTrout</span></p>", "it handles mentions at the beginning of a new line");
  cooked("`evil` @EvilTrout `trout`",
         "<p><code>evil</code> <span class=\"mention\">@EvilTrout</span> <code>trout</code></p>",
         "deals correctly with multiple <code> blocks");
  cooked("```\na @test\n```", "<p><pre><code class=\"lang-auto\">a @test</code></pre></p>", "should not do mentions within a code block.");

  cooked("> foo bar baz @eviltrout",
         "<blockquote><p>foo bar baz <span class=\"mention\">@eviltrout</span></p></blockquote>",
         "handles mentions in simple quotes");

  cooked("> foo bar baz @eviltrout ohmagerd\nlook at this",
         "<blockquote><p>foo bar baz <span class=\"mention\">@eviltrout</span> ohmagerd\nlook at this</p></blockquote>",
         "does mentions properly with trailing text within a simple quote");

  cooked("`code` is okay before @mention",
         "<p><code>code</code> is okay before <span class=\"mention\">@mention</span></p>",
         "Does not mention in an inline code block");

  cooked("@mention is okay before `code`",
         "<p><span class=\"mention\">@mention</span> is okay before <code>code</code></p>",
         "Does not mention in an inline code block");

  cooked("don't `@mention`",
         "<p>don't <code>@mention</code></p>",
         "Does not mention in an inline code block");

  cooked("Yes `@this` should be code @eviltrout",
         "<p>Yes <code>@this</code> should be code <span class=\"mention\">@eviltrout</span></p>",
         "Does not mention in an inline code block");

  cooked("@eviltrout and `@eviltrout`",
         "<p><span class=\"mention\">@eviltrout</span> and <code>@eviltrout</code></p>",
         "you can have a mention in an inline code block following a real mention.");

  cooked("1. this is  a list\n\n2. this is an @eviltrout mention\n",
         "<ol><li><p>this is  a list</p></li><li><p>this is an <span class=\"mention\">@eviltrout</span> mention  </p></li></ol>",
         "it mentions properly in a list.");

});

test("Oneboxing", function() {

  var matches = function(input, regexp) {
    return Discourse.Markdown.cook(input, {mentionLookup: false }).match(regexp);
  };

  ok(!matches("- http://www.textfiles.com/bbs/MINDVOX/FORUMS/ethics\n\n- http://drupal.org", /onebox/),
              "doesn't onebox a link within a list");

  ok(matches("http://test.com", /onebox/), "adds a onebox class to a link on its own line");
  ok(matches("http://test.com\nhttp://test2.com", /onebox[\s\S]+onebox/m), "supports multiple links");
  ok(!matches("http://test.com bob", /onebox/), "doesn't onebox links that have trailing text");

  cooked("http://en.wikipedia.org/wiki/Homicide:_Life_on_the_Street",
         "<p><a href=\"http://en.wikipedia.org/wiki/Homicide:_Life_on_the_Street\" class=\"onebox\"" +
         ">http://en.wikipedia.org/wiki/Homicide:_Life_on_the_Street</a></p>",
         "works with links that have underscores in them");

});

test("Code Blocks", function() {

  cooked("```\na\nb\nc\n\nd\n```",
         "<p><pre><code class=\"lang-auto\">a\nb\nc\n\nd</code></pre></p>",
         "it treats new lines properly");

  cooked("```\ntest\n```",
         "<p><pre><code class=\"lang-auto\">test</code></pre></p>",
         "it supports basic code blocks");

  cooked("```json\n{hello: 'world'}\n```\ntrailing",
         "<p><pre><code class=\"json\">{hello: &#x27;world&#x27;}</code></pre></p>\n\n<p>\ntrailing</p>",
         "It does not truncate text after a code block.");

  cooked("```json\nline 1\n\nline 2\n\n\nline3\n```",
         "<p><pre><code class=\"json\">line 1\n\nline 2\n\n\nline3</code></pre></p>",
         "it maintains new lines inside a code block.");

  cooked("hello\nworld\n```json\nline 1\n\nline 2\n\n\nline3\n```",
         "<p>hello<br>world<br></p>\n\n<p><pre><code class=\"json\">line 1\n\nline 2\n\n\nline3</code></pre></p>",
         "it maintains new lines inside a code block with leading content.");

  cooked("```text\n<header>hello</header>\n```",
         "<p><pre><code class=\"text\">&lt;header&gt;hello&lt;/header&gt;</code></pre></p>",
         "it escapes code in the code block");

  cooked("```ruby\n# cool\n```",
         "<p><pre><code class=\"ruby\"># cool</code></pre></p>",
         "it supports changing the language");

  cooked("    ```\n    hello\n    ```",
         "<pre><code>&#x60;&#x60;&#x60;\nhello\n&#x60;&#x60;&#x60;</code></pre>",
         "only detect ``` at the begining of lines");
});

test("SanitizeHTML", function() {

  equal(sanitizeHtml("<div><script>alert('hi');</script></div>"), "<div></div>");
  equal(sanitizeHtml("<div><p class=\"funky\" wrong='1'>hello</p></div>"), "<div><p class=\"funky\">hello</p></div>");
  cooked("hello<script>alert(42)</script>", "<p>hello</p>", "it sanitizes while cooking");

  cooked("<a href='http://disneyland.disney.go.com/'>disney</a> <a href='http://reddit.com'>reddit</a>",
         "<p><a href=\"http://disneyland.disney.go.com/\">disney</a> <a href=\"http://reddit.com\">reddit</a></p>",
         "we can embed proper links");

});

test("URLs in BBCode tags", function() {

  cooked("[img]http://eviltrout.com/eviltrout.png[/img][img]http://samsaffron.com/samsaffron.png[/img]",
         "<p><img src=\"http://eviltrout.com/eviltrout.png\"><img src=\"http://samsaffron.com/samsaffron.png\"></p>",
         "images are properly parsed");

  cooked("[url]http://discourse.org[/url]",
         "<p><a href=\"http://discourse.org\">http://discourse.org</a></p>",
         "links are properly parsed");

  cooked("[url=http://discourse.org]discourse[/url]",
         "<p><a href=\"http://discourse.org\">discourse</a></p>",
         "named links are properly parsed");

});
