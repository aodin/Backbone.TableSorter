(function() {
  var TableSorter = function(selector, options) {
    // TODO Allow options to be passed as the first parameter
    if (!selector) {
      // A null selector was given, create an empty table
      this.setElement($('<table><thead /><tbody /></table>'));
    } else {
      this.setElement($(selector));
    }
    Backbone.View.call(this, options);
    this.postInitialize.call(this, options);

    // TODO Possible future options
    // * Custom attribute for data values
    // * Manual specification of column types
  };

  TableSorter.VERSION = '0.1.0';
  TableSorter.extend = Backbone.View.extend;

  // TODO we'll require both backbone and underscore

  _.extend(TableSorter.prototype, Backbone.View.prototype, {
    postInitialize: function(options) {
      options || (options = {});
      // Don't touch variables that start with underscore
      this._rows = this.parseTable();

      // Determine a type for the cells
      this.detect();

      // Turn the th elements in thead to clickable sorters
      this.createSelectEvents();

      // Create the collection
      var inverted, col = 0;
      if (options.order_by) {
        // Set the default ordering
        // TODO It can only sort one column at a time for now
        var inverted;
        // TODO Wait, are object keys ordered?
        for (col in options.order_by) {
          inverted = options.order_by[col].toLowerCase() === 'desc';
          break;
        }
        if (inverted) this.inversion = {col: inverted};
      }
      this.createCollection(this._rows, col, inverted);

      // TODO When to render?
      this.render();
    },
    createCollection: function(rows, col, inverted) {
      this.collection = new Backbone.Collection(rows, {
        // This will sort on the first column
        // TODO give it a default inversion
        // Inversion needs to be set as an attribute or if an desc column is
        // specified as default it will remain desc when clicked again
        comparator: this.buildComparator(col, inverted),
      }, this);
    },
    // Events
    // ------
    createSelectEvents: function() {
      // TODO why is this closure needed?
      var self = this;
      // TODO method to prevent sorting on a given header
      // TODO There might not be a thead, what then?
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
    // Rendering
    // ---------
    render: function() {
      // Empty the table body and replace the rows
      // TODO save "body" as a separate object, will help with extensions
      var tbody = this.getBody();
      if (tbody) tbody.empty();
      _.each(this.collection.models, function(m) {
        tbody.append(m.get('html'));
      }, this);
      return this;
    },
    // Type Detection and Sorting
    // --------------------------
    detect: function() {
      if (!this._rows.length) return;
      // Detect the type of each cell
      this._formats = [];
      // TODO What if the rows are different lengths?
      // TODO These selectors are nutssssssssss
      for (var c = 0, clen = this._rows[0]['cells'].length; c < clen; c++) {
        // Proceed to the next row if no type was determined
        for (var r = 0, rlen = this._rows.length; r < rlen; r++) {
          var val = this._rows[r]['cells'][c];
          this._formats[c] = _.find(this.comparators, function(cmp) {
            return val ? cmp.match(val) : null;
          }, this);
          if (this._formats[c]) break;
        }
      }
    },
    resort: function(col, $th) {
      var inverted = this.inversion && (col in this.inversion);
      this.collection.comparator = this.buildComparator(col, inverted)
      // If inverted, simply clear the inversion so that the next time
      // this col is clicked, it will sort un-inverted
      this.inversion = {};
      // TODO 'inverted' would be more approriately named 'to be inverted'
      // TODO All these classes should be extensible!
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
    // TODO Provide a public interface to add, remove or shuffle comparators
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
    buildComparator: function(col, invert) {
      // TODO dumb loss of context
      var formats = this._formats;
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
    // Parsers
    // -------
    // TODO any clean way to get rid of this function?
    getBody: function() {
      return this.$('tbody');
    },
    parseTable: function() {
      // TODO either return the collection?
      // TODO There may not be a tbody; should that selector be optional?
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
      // TODO Native selectors for speed, but what about compatability? 
      return el.hasAttribute('data-value') ? el.getAttribute('data-value') : el.textContent || el.innerText;
    },
    // Building
    // --------
    // TODO This functionality needs some love, perhaps, meta-love?
    setHeader: function(headers) {
      // Overwrite the header to be the specified values
      var header = '<tr>';
      for (var i = 0, len = headers.length; i < len; i++) {
        header += ('<th>' + String(headers[i]) + '</th>');
      }
      header += '</tr>';
      this.$('thead').html(header);
    },
    addRow: function(cells) {
      // TODO length of row must match header
      var cell = {
        cells: cells,
        row: '<tr>',
      };
      for (var i = 0, len = cells.length; i < len; i++) {
        cell.row += ('<td>' + String(cells[i]) + '</td>');
      }
      cell.row += '</tr>';

      // If this is the first row added, create the collection
      if (!this.collection.length) {
        this._rows = [cell];
        this.createCollection(this._rows);
      } else {
        // Otherwise, add the row
        this._rows.push(cell);
      }
    },
    formats: function() {
      // Return the dictionary format for introspection
      return this._formats;
    }
  });

  Backbone.TableSorter = TableSorter;

}).call(this);
