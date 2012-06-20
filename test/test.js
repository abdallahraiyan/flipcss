/* jshint: */
/*global public_functions assert require flipcss fs:true sinon:true */

fs = require("fs");
sinon = require("sinon");

if (typeof require !== "undefined") {
    var buster = require("buster");
    var lib = require("../flipcss");
}


buster.assertions.add("pathFlipsTo", {
    assert: function (inputPath, expectedOutputPath) {
        var input = fs.readFileSync(inputPath).toString();
        var expectedOutput = fs.readFileSync(expectedOutputPath).toString();

        this.output = lib.flip(input);
        return this.output === expectedOutput;
    },
    assertMessage: "Expected ${0} to flip to ${1}, got \"${output}\".",
    refuteMessage: "Expected ${0} to not flip to ${1}, got \"${output}\"."
});


buster.assertions.add("flipsTo", {
    assert: function (input, expectedOutput) {
        this.output = lib.flip(input);
        return this.output === expectedOutput;
    },
    assertMessage: "Expected \"${0}\" to flip to \"${1}\", got \"${output}\".",
    refuteMessage: "Expected \"${0}\" to not flip to \"${1}\","
        + " got \"${output}\"."
});


buster.testCase("Functional tests: Flip stylesheet w/ pre-processing", {
    setUp: function () {
        sinon.spy(console, "log");
    },

    tearDown: function () {
        console.log.restore();
    },

    "flip without warnings": function() {
        var input = fs.readFileSync("fixtures/input_all.css").toString();
        var output = fs.readFileSync("fixtures/output_all.css").toString();

        input = lib.clean(input, "rtl");
        assert.flipsTo(input, output);
    },

    "flip with warnings": function() {
        var input = fs.readFileSync("fixtures/input_all.css").toString();
        var output = fs.readFileSync("fixtures/output_all.css").toString();

        input = lib.clean(input, "rtl");
        assert.equals(lib.flip(input, true), output);

        // Check that warnings are given
        assert(console.log.calledTwice);
        var spyCall = console.log.getCall(0);
        assert(-1 < spyCall.args[0].indexOf("Warning: Inline"));
    }
});


buster.testCase("CSS word swapper", {
    "swaps floats": function() {
        // Basic case: Swap right with left
        assert.flipsTo(".foo { float: right; }",
                       ".foo { float: left; }");
        // Basic case: Swap left with right
        assert.flipsTo(".foo { clear: left; }",
                       ".foo { clear: right; }");
        // Extra keyword: Swap left with right
        assert.flipsTo(".foo { float: right !important; }",
                       ".foo { float: left !important; }");
        // No whitespace: Swap left with right
        assert.flipsTo(".foo{float:right !important;}",
                       ".foo{float:left !important;}");
        // Extra whitespace: Swap left with right
        assert.flipsTo("  .foo  {  float:right  !important  ;  }  ",
                       "  .foo  {  float:left  !important  ;  }  ");
    },
    "swaps text-align": function() {
        // Basic case: Swap left with right
        assert.flipsTo(".foo { text-align: left; }",
                       ".foo { text-align: right; }");
    },
    "swaps margins and paddings": function() {
        // Basic case: Swap margin-left with margin-right
        assert.flipsTo(".foo { margin-left: 2em; }",
                       ".foo { margin-right: 2em; }");
        // Basic case: Swap padding-left with padding-right
        assert.flipsTo(".foo { padding-left: 2em; }",
                       ".foo { padding-right: 2em; }");
        // Extra keyword: Swap padding-left with padding-right
        assert.flipsTo(".foo { padding-left: 2em !important; }",
                       ".foo { padding-right: 2em !important; }");
    },
    "swaps left and right positioning": function() {
        // Basic case: Swap left with right
        assert.flipsTo(".foo { left: 10px; }",
                       ".foo { right: 10px; }");
    },
    "understands the difference between words and subwords": function() {
        // "Copyright" should be unchanged (full word), but float should be changed.
        assert.flipsTo(".copyright { float: right; }",
                       ".copyright { float: left; }");
        // "rights.png" Should not be changed (subword)
        assert.flipsTo("background: url('rights.png')",
                       "background: url('rights.png')");
        // "arrow-left.png" Should be changed (subword)
        assert.flipsTo("background: url('arrow-left.png')",
                       "background: url('arrow-right.png')");
        // "pull-right" should be changed (subword), and float should be changed
        assert.flipsTo(".pull-right { float: right; }",
                       ".pull-left { float: left; }");
    },
    "values": function() {
        assert.pathFlipsTo("fixtures/input_swap_values.css",
                           "fixtures/output_swap_values.css");
    },
    "(background position values)": function() {
        assert.pathFlipsTo("fixtures/input_background_position.css",
                           "fixtures/output_background_position.css");
    },
    "(ignored rules)": function() {
        // Basic case: Nothing should change.
        assert.flipsTo(".foo { clear: left; /* !direction-ignore */ }",
                       ".foo { clear: left; /* !direction-ignore */ }");
        // Extra keywords: Nothing should change.
        assert.flipsTo(".foo { clear: left !important; /* !direction-ignore */ }",
                       ".foo { clear: left !important; /* !direction-ignore */ }");
        // Without whitespace: Nothing should change.
        assert.flipsTo(".foo{clear:left;/*!direction-ignore*/}",
                       ".foo{clear:left;/*!direction-ignore*/}");
        // Extra whitespace: Nothing should change.
        assert.flipsTo("  .foo {  clear:  left  !important;  /*  !direction-ignore  */  }  ",
                       "  .foo {  clear:  left  !important;  /*  !direction-ignore  */  }  ");
        // Newline before comment: Nothing should change, except newline should be removed.
        assert.flipsTo(".foo { clear: left !important;\n /* !direction-ignore */ }",
                       ".foo { clear: left !important; /* !direction-ignore */ }");
    }
});


buster.testCase("Flip CSS", {
    "swap values (margin/padding)": function() {
        assert.pathFlipsTo("fixtures/input_swap_values.css",
                           "fixtures/output_swap_values.css");
    },

    "swap background position values": function() {
        assert.pathFlipsTo("fixtures/input_background_position.css",
                           "fixtures/output_background_position.css");
    }
});


buster.testCase("Direction specific CSS (cleaning)", {
    "add direction rule to body": function() {
        var input, output;

        input = "body { display: inline-block; }";
        output = "body {direction:rtl; display: inline-block; }";
        assert.equals(lib.clean(input, "rtl"), output);

        input = "foo {} body { display: inline-block; } bar {}";
        output = "foo {} body {direction:rtl; display: inline-block; } bar {}";
        assert.equals(lib.clean(input, "rtl"), output);
    },

    "add body group with direction rule": function() {
        var input = "div { display: inline-block; }";
        var output = "body{direction:rtl;}div { display: inline-block; }";
        assert.equals(lib.clean(input, "rtl"), output);
    },

    "direction-specific rules left unchanged on flip": function() {
        var input, output;

        // Left/right swapping:
        input = "margin: left; /* !rtl-only */";
        output = "margin: left; /* !rtl-only */";
        assert.flipsTo(input, output);

        input = "margin: left; /* !ltr-only */"; // would normally be cleaned
        output = "margin: left; /* !ltr-only */";
        assert.flipsTo(input, output);

        // Background position swapping
        input = "background: url('@{image-url}/foo.bar') 60% 0 no-repeat;"
            + "/* !rtl-only */";
        output = "background: url('@{image-url}/foo.bar')"
            + "60% 0 no-repeat; /* !rtl-only */";

        // Margin/padding value swapping
        input = "padding: 0.5em 1em 0.5em 3.2em; /* !rtl-only */";
        output = "padding: 0.5em 1em 0.5em 3.2em; "
               + "/* !rtl-only */";

        assert.flipsTo(input, output);
    },

    "delete rtl-only CSS rules": function() {
        var func = lib.clean;

        var input = fs.readFileSync("fixtures/input_clean.css")
            .toString();
        var output = fs.readFileSync("fixtures/output_clean.css")
            .toString();
        assert.equals(func(input, "ltr"), output);
    }
});
