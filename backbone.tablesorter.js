(function() {
  var root = this;
  var TableSorter;
  TableSorter = root.TableSorter = {};
  TableSorter.VERSION = '0.0.1';

  // TODO we'll require both backbone and underscore

  // TODO promote the sort function to top-level?
  var Sort = TableSorter.Sort = Backbone.View.extend({
    initialize: function(options) {
      // Parse the $el, which should be a table
      // TODO confirm it is a table? what safety checks should we have?
      // Set the body element (this.$body) in an extensible manner
      this.setBody();

      this.rows = this.parseTable();

      // Figure out a basic format for the rows
      this.detect();

      // Turn the th elements in thead to clickable sorters
      this.createSelectEvents();

      // TODO hard-coded inversion?
      // TODO default inversion will need to live in another variable since
      // this one is constantly re-written
      this.inversion = {0: true};
      // TODO better default system, add classes

      // Create the collection
      this.collection = new Backbone.Collection(this.rows, {
        // This will sort on the first column
        // TODO give it a default inversion
        comparator: this.buildComparator(0),
      });
      // TODO automatically render on every sort?
      this.render();
    },
    buildComparator: function(col, invert) {
      // TODO dumb loss of context
      var formats = this.formats;
      // TODO Can the cells be stored separately from the model/collection?
      if (invert) {
        return function(a, b) {
          // TODO A ridiculous string
          return -formats[col].comparator(a.get('cells')[col], b.get('cells')[col]);
        };
      }
      return function(a, b) {
        // TODO A ridiculous string
        return formats[col].comparator(a.get('cells')[col], b.get('cells')[col]);
      };
    },
    resort: function(col, $th) {
      var inverted = col in this.inversion;
      this.collection.comparator = this.buildComparator(col, inverted)
      // If inverted, simply clear the inversion so that the next time
      // this col is clicked, it will sort un-inverted
      // TODO some trickery will be needed with default sorting
      this.inversion = {};
      // TODO 'inversion' would be more approriately named 'to be inverted'
      $th.addClass('active');
      if (inverted) {
        $th.addClass('desc');
      } else {
        // If not inverted, add this col to the inversion dict, so if the
        // col is clicked again, it will sort inverted
        this.inversion[col] = true;
        $th.addClass('asc');
      }
      // Reset the inversion with the new comparator
      this.collection.sort();
      this.render();
    },
    setBody: function() {
      this.$body = this.$('tbody');
    },
    render: function() {
      // Empty the table body and replace the rows
      // TODO save "body" as a separate object, will help with extensions
      this.$body.empty();
      _.each(this.collection.models, function(m) {
        this.$body.append(m.get('html'));
      }, this);
      return this;
    },
    createSelectEvents: function() {
      // TODO why is this closure needed?
      var self = this;
      // TODO method to prevent sorting on a given header
      var headers = this.$('thead th');
      _.each(headers, function(th, col) {
        // $(th).on('click', function() {
        $(th).click(function() {
          // TODO add a class for inversion?
          // TODO native selectors
          headers.removeClass('active asc desc');
          var $th = $(this);
          // TODO use a trigger and bind?
          // TODO stupid self
          self.resort.call(self, col, $th);
        });
        // }, this); // TODO won't work
      }, this);
    },
    detect: function() {
      // Just detect the first row
      if (!this.rows) return;

      // TODO cells is dumb?
      var firstRow = this.rows[0]['cells'];
      this.formats = {};
      for (var i = 0, len = firstRow.length; i < len; i++) {
        var cellValue = firstRow[i];
        this.formats[i] = _.find(this.comparators, function(c) {
          return c.match(cellValue);
        }, this);
      }
    },
    // TODO how to provide capability to easily change/remove comparators?
    comparators: [
      {
        name: 'numeric',
        // TODO compile regular expressions for speed?
        // match: function(s) { return /^[-+]?\d*$/.test(s); },
        match: function(s) { return !isNaN(s); },
        comparator: function(a, b) { return a - b; },
      },
      {
        name: 'text',
        match: function(s) { return true; },
        comparator: function(a, b) { return a.localeCompare(b); },
      },
    ],
    parseTable: function() {
      // TODO either return the collection?
      return _.map(this.$('tbody tr'), this.parseRow, this);
    },
    parseRow: function(row) {
      // Turn the given tr element in an array of values
      // TODO native selectors for speed
      return {
        html: row,
        cells: _.map($(row).find('td'), this.parseCell, this),
      };
    },
    parseCell: function(el) {
      // Turn the given td element into a sortable "value"
      // return $(cell).text();
      // Native selector
      return el.textContent || el.innerText;
    },
  });

}).call(this);
