(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.cytoscapeGraphml = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){

module.exports = function (cy, $, options) {

  function xmlToString(xmlData) {

    var xmlString;
    //IE
    if (window.ActiveXObject) {
      xmlString = xmlData.xml;
    }
    // code for Mozilla, Firefox, Opera, etc.
    else {
      xmlString = (new XMLSerializer()).serializeToString(xmlData);
    }
    return xmlString;
  }


  function getEleData(ele) {
    var type = ele.isNode() ? "node" : "edge";
    var attrs = ["css", "data", "position"];
    var result = {};

    for (var i = 0; i < attrs.length; i++) {
      var attr = attrs[i];
      var opt = options[type][attr];
      if (!opt)
        result[attr] = {};
      else if ($.isArray(opt)) {
        result[attr] = {};
        for (var j = 0; j < opt.length; j++) {
          var el = opt[i];
          if (ele[attr](el))
            result[attr][el] = ele[attr](el);
        }
      } else {
        var eleAttr = ele[attr]();
        result[attr] = {};
        for (var key in eleAttr)
          if ($.inArray(key, options[type].discludeds) < 0 && key != "parent")
            result[attr][key] = {value: eleAttr[key], attrType: attr};

      }
    }

    return $.extend(result.css, result.data, result.position);
  }


  function parseNode(ele, xml) {
    var node = $('<node />', xml).attr({id: ele.id()}).appendTo(xml);

    var eleData = getEleData(ele);
    for (var key in eleData)
      $('<data />', node).attr({type: eleData[key].attrType, key: key}).text(eleData[key].value).appendTo(node);


    if (ele.isParent()) {
      var subgraph = $('<graph />', node).attr({id: ele.id() + ':'}).appendTo(node);
      ele.children().each(function (child) {
        parseNode(child, subgraph);
      });
    }

    return node;
  }


  options.node.discludeds.push("id");
  options.edge.discludeds.push("id", "source", "target");

  var xmlDoc = $.parseXML(
          '<?xml version="1.0" encoding="UTF-8"?>\n' +
          '<graphml xmlns="http://graphml.graphdrawing.org/xmlns"\n' +
          'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n' +
          'xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns\n' +
          'http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd">\n' +
          '  <graph>\n' +
          ' </graph>\n' +
          ' </graphml>\n'
          );
  var $xml = $(xmlDoc);

  var $graph = $xml.find("graph");

  cy.nodes().orphans().forEach(function (ele) {
    parseNode(ele, $graph);
  });

  cy.edges().forEach(function (ele) {

    var edge = $('<edge />', $graph).attr({id: ele.id(), source: ele.source().id(), target: ele.target().id()}).appendTo($graph);

    var eleData = getEleData(ele);
    for (var key in eleData)
      $('<data />', edge).attr({key: key}).text(eleData[key].value).appendTo(edge);

  });


  return xmlToString(xmlDoc);
};

},{}],2:[function(_dereq_,module,exports){
module.exports = function (cy, $, options, cyGraphML) {
  function renderNode($graph, $parent) {
    $graph.children("node").each(function () {
      var $node = $(this);

      var settings = {
        data: {id: $node.attr("id")},
        css: {},
        position: {}
      };

      if($parent != null)
        settings["data"]["parent"] = $parent.attr("id");

      $node.children('data').each(function () {
        var $data = $(this);
        settings["data"][$data.attr("key")] = $data.text();
      });

      cy.add({
        group: "nodes",
        data: settings.data,
//        css: settings.css,
        position: settings.position
      });

      $node.children("graph").each(function () {
        var $graph = $(this);

        renderNode($graph, $node);
      });
    });
  }

  cy.batch(function () {
    xml = $.parseXML(cyGraphML);
    $xml = $(xml);

    $graphs = $xml.find("graph").first();

    $graphs.each(function () {
      var $graph = $(this);

      renderNode($graph, null);

      $graph.find("edge").each(function () {
        var $edge = $(this);

        var settings = {
          data: {id: $edge.attr("id"), source: $edge.attr("source"), target: $edge.attr("target")},
          css: {},
          position: {}
        };

        $edge.find('data').each(function () {
          var $data = $(this);
          settings["data"][$data.attr("key")] = $data.text();
        });

        cy.add({
          group: "edges",
          data: settings.data,
          css: settings.css
        });
      });

    });
    var layoutOptT = typeof options.layoutBy;
    if (layoutOptT == "string")
       cy.layout({name: options.layoutBy}).run();
    else if (layoutOptT == "function")
      options.layoutBy();
  });
};

},{}],3:[function(_dereq_,module,exports){
;
(function () {
  'use strict';

  // registers the extension on a cytoscape lib ref
  var register = function (cytoscape, $) {

    if (!cytoscape || !$) {
      return;
    } // can't register if cytoscape unspecified

    var exporter = _dereq_("./exporter");
    var importer = _dereq_("./importer");


    var options = {
      node: {
        css: false,
        data: true,
        position: true,
        discludeds: []
      },
      edge: {
        css: false,
        data: true,
        discludeds: []
      },
      layoutBy: "cose" // string of layout name or layout function
    };



    cytoscape('core', 'graphml', function (cyGraphML) {
      var cy = this;
      var res;

      switch (typeof cyGraphML) {
        case "string": // import
          res = importer(cy, $, options, cyGraphML);
          break;
        case "object": // set options
          $.extend(true, options, cyGraphML);
          res = cy;
          break;
        case "undefined": // export
          res = exporter(cy, $, options);
          break;
        default:
          console.log("Functionality(argument) of .graphml() is not recognized.");
      }

      return res;

    });

  };

  if (typeof module !== 'undefined' && module.exports) { // expose as a commonjs module
    module.exports = register;
  }

  if (typeof define !== 'undefined' && define.amd) { // expose as an amd/requirejs module
    define('cytoscape-graphml', function () {
      return register;
    });
  }

  if (typeof cytoscape !== 'undefined' && typeof $ !== 'undefined') { // expose to global cytoscape (i.e. window.cytoscape)
    register(cytoscape, $);
  }

})();

},{"./exporter":1,"./importer":2}]},{},[3])(3)
});

//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvZXhwb3J0ZXIuanMiLCJzcmMvaW1wb3J0ZXIuanMiLCJzcmMvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGN5LCAkLCBvcHRpb25zKSB7XG5cbiAgZnVuY3Rpb24geG1sVG9TdHJpbmcoeG1sRGF0YSkge1xuXG4gICAgdmFyIHhtbFN0cmluZztcbiAgICAvL0lFXG4gICAgaWYgKHdpbmRvdy5BY3RpdmVYT2JqZWN0KSB7XG4gICAgICB4bWxTdHJpbmcgPSB4bWxEYXRhLnhtbDtcbiAgICB9XG4gICAgLy8gY29kZSBmb3IgTW96aWxsYSwgRmlyZWZveCwgT3BlcmEsIGV0Yy5cbiAgICBlbHNlIHtcbiAgICAgIHhtbFN0cmluZyA9IChuZXcgWE1MU2VyaWFsaXplcigpKS5zZXJpYWxpemVUb1N0cmluZyh4bWxEYXRhKTtcbiAgICB9XG4gICAgcmV0dXJuIHhtbFN0cmluZztcbiAgfVxuXG5cbiAgZnVuY3Rpb24gZ2V0RWxlRGF0YShlbGUpIHtcbiAgICB2YXIgdHlwZSA9IGVsZS5pc05vZGUoKSA/IFwibm9kZVwiIDogXCJlZGdlXCI7XG4gICAgdmFyIGF0dHJzID0gW1wiY3NzXCIsIFwiZGF0YVwiLCBcInBvc2l0aW9uXCJdO1xuICAgIHZhciByZXN1bHQgPSB7fTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXR0cnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBhdHRyID0gYXR0cnNbaV07XG4gICAgICB2YXIgb3B0ID0gb3B0aW9uc1t0eXBlXVthdHRyXTtcbiAgICAgIGlmICghb3B0KVxuICAgICAgICByZXN1bHRbYXR0cl0gPSB7fTtcbiAgICAgIGVsc2UgaWYgKCQuaXNBcnJheShvcHQpKSB7XG4gICAgICAgIHJlc3VsdFthdHRyXSA9IHt9O1xuICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IG9wdC5sZW5ndGg7IGorKykge1xuICAgICAgICAgIHZhciBlbCA9IG9wdFtpXTtcbiAgICAgICAgICBpZiAoZWxlW2F0dHJdKGVsKSlcbiAgICAgICAgICAgIHJlc3VsdFthdHRyXVtlbF0gPSBlbGVbYXR0cl0oZWwpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgZWxlQXR0ciA9IGVsZVthdHRyXSgpO1xuICAgICAgICByZXN1bHRbYXR0cl0gPSB7fTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIGVsZUF0dHIpXG4gICAgICAgICAgaWYgKCQuaW5BcnJheShrZXksIG9wdGlvbnNbdHlwZV0uZGlzY2x1ZGVkcykgPCAwICYmIGtleSAhPSBcInBhcmVudFwiKVxuICAgICAgICAgICAgcmVzdWx0W2F0dHJdW2tleV0gPSB7dmFsdWU6IGVsZUF0dHJba2V5XSwgYXR0clR5cGU6IGF0dHJ9O1xuXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuICQuZXh0ZW5kKHJlc3VsdC5jc3MsIHJlc3VsdC5kYXRhLCByZXN1bHQucG9zaXRpb24pO1xuICB9XG5cblxuICBmdW5jdGlvbiBwYXJzZU5vZGUoZWxlLCB4bWwpIHtcbiAgICB2YXIgbm9kZSA9ICQoJzxub2RlIC8+JywgeG1sKS5hdHRyKHtpZDogZWxlLmlkKCl9KS5hcHBlbmRUbyh4bWwpO1xuXG4gICAgdmFyIGVsZURhdGEgPSBnZXRFbGVEYXRhKGVsZSk7XG4gICAgZm9yICh2YXIga2V5IGluIGVsZURhdGEpXG4gICAgICAkKCc8ZGF0YSAvPicsIG5vZGUpLmF0dHIoe3R5cGU6IGVsZURhdGFba2V5XS5hdHRyVHlwZSwga2V5OiBrZXl9KS50ZXh0KGVsZURhdGFba2V5XS52YWx1ZSkuYXBwZW5kVG8obm9kZSk7XG5cblxuICAgIGlmIChlbGUuaXNQYXJlbnQoKSkge1xuICAgICAgdmFyIHN1YmdyYXBoID0gJCgnPGdyYXBoIC8+Jywgbm9kZSkuYXR0cih7aWQ6IGVsZS5pZCgpICsgJzonfSkuYXBwZW5kVG8obm9kZSk7XG4gICAgICBlbGUuY2hpbGRyZW4oKS5lYWNoKGZ1bmN0aW9uIChjaGlsZCkge1xuICAgICAgICBwYXJzZU5vZGUoY2hpbGQsIHN1YmdyYXBoKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBub2RlO1xuICB9XG5cblxuICBvcHRpb25zLm5vZGUuZGlzY2x1ZGVkcy5wdXNoKFwiaWRcIik7XG4gIG9wdGlvbnMuZWRnZS5kaXNjbHVkZWRzLnB1c2goXCJpZFwiLCBcInNvdXJjZVwiLCBcInRhcmdldFwiKTtcblxuICB2YXIgeG1sRG9jID0gJC5wYXJzZVhNTChcbiAgICAgICAgICAnPD94bWwgdmVyc2lvbj1cIjEuMFwiIGVuY29kaW5nPVwiVVRGLThcIj8+XFxuJyArXG4gICAgICAgICAgJzxncmFwaG1sIHhtbG5zPVwiaHR0cDovL2dyYXBobWwuZ3JhcGhkcmF3aW5nLm9yZy94bWxuc1wiXFxuJyArXG4gICAgICAgICAgJ3htbG5zOnhzaT1cImh0dHA6Ly93d3cudzMub3JnLzIwMDEvWE1MU2NoZW1hLWluc3RhbmNlXCJcXG4nICtcbiAgICAgICAgICAneHNpOnNjaGVtYUxvY2F0aW9uPVwiaHR0cDovL2dyYXBobWwuZ3JhcGhkcmF3aW5nLm9yZy94bWxuc1xcbicgK1xuICAgICAgICAgICdodHRwOi8vZ3JhcGhtbC5ncmFwaGRyYXdpbmcub3JnL3htbG5zLzEuMC9ncmFwaG1sLnhzZFwiPlxcbicgK1xuICAgICAgICAgICcgIDxncmFwaD5cXG4nICtcbiAgICAgICAgICAnIDwvZ3JhcGg+XFxuJyArXG4gICAgICAgICAgJyA8L2dyYXBobWw+XFxuJ1xuICAgICAgICAgICk7XG4gIHZhciAkeG1sID0gJCh4bWxEb2MpO1xuXG4gIHZhciAkZ3JhcGggPSAkeG1sLmZpbmQoXCJncmFwaFwiKTtcblxuICBjeS5ub2RlcygpLm9ycGhhbnMoKS5mb3JFYWNoKGZ1bmN0aW9uIChlbGUpIHtcbiAgICBwYXJzZU5vZGUoZWxlLCAkZ3JhcGgpO1xuICB9KTtcblxuICBjeS5lZGdlcygpLmZvckVhY2goZnVuY3Rpb24gKGVsZSkge1xuXG4gICAgdmFyIGVkZ2UgPSAkKCc8ZWRnZSAvPicsICRncmFwaCkuYXR0cih7aWQ6IGVsZS5pZCgpLCBzb3VyY2U6IGVsZS5zb3VyY2UoKS5pZCgpLCB0YXJnZXQ6IGVsZS50YXJnZXQoKS5pZCgpfSkuYXBwZW5kVG8oJGdyYXBoKTtcblxuICAgIHZhciBlbGVEYXRhID0gZ2V0RWxlRGF0YShlbGUpO1xuICAgIGZvciAodmFyIGtleSBpbiBlbGVEYXRhKVxuICAgICAgJCgnPGRhdGEgLz4nLCBlZGdlKS5hdHRyKHtrZXk6IGtleX0pLnRleHQoZWxlRGF0YVtrZXldLnZhbHVlKS5hcHBlbmRUbyhlZGdlKTtcblxuICB9KTtcblxuXG4gIHJldHVybiB4bWxUb1N0cmluZyh4bWxEb2MpO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGN5LCAkLCBvcHRpb25zLCBjeUdyYXBoTUwpIHtcbiAgZnVuY3Rpb24gcmVuZGVyTm9kZSgkZ3JhcGgsICRwYXJlbnQpIHtcbiAgICAkZ3JhcGguY2hpbGRyZW4oXCJub2RlXCIpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgdmFyICRub2RlID0gJCh0aGlzKTtcblxuICAgICAgdmFyIHNldHRpbmdzID0ge1xuICAgICAgICBkYXRhOiB7aWQ6ICRub2RlLmF0dHIoXCJpZFwiKX0sXG4gICAgICAgIGNzczoge30sXG4gICAgICAgIHBvc2l0aW9uOiB7fVxuICAgICAgfTtcblxuICAgICAgaWYoJHBhcmVudCAhPSBudWxsKVxuICAgICAgICBzZXR0aW5nc1tcImRhdGFcIl1bXCJwYXJlbnRcIl0gPSAkcGFyZW50LmF0dHIoXCJpZFwiKTtcblxuICAgICAgJG5vZGUuY2hpbGRyZW4oJ2RhdGEnKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyICRkYXRhID0gJCh0aGlzKTtcbiAgICAgICAgc2V0dGluZ3NbXCJkYXRhXCJdWyRkYXRhLmF0dHIoXCJrZXlcIildID0gJGRhdGEudGV4dCgpO1xuICAgICAgfSk7XG5cbiAgICAgIGN5LmFkZCh7XG4gICAgICAgIGdyb3VwOiBcIm5vZGVzXCIsXG4gICAgICAgIGRhdGE6IHNldHRpbmdzLmRhdGEsXG4vLyAgICAgICAgY3NzOiBzZXR0aW5ncy5jc3MsXG4gICAgICAgIHBvc2l0aW9uOiBzZXR0aW5ncy5wb3NpdGlvblxuICAgICAgfSk7XG5cbiAgICAgICRub2RlLmNoaWxkcmVuKFwiZ3JhcGhcIikuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciAkZ3JhcGggPSAkKHRoaXMpO1xuXG4gICAgICAgIHJlbmRlck5vZGUoJGdyYXBoLCAkbm9kZSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGN5LmJhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICB4bWwgPSAkLnBhcnNlWE1MKGN5R3JhcGhNTCk7XG4gICAgJHhtbCA9ICQoeG1sKTtcblxuICAgICRncmFwaHMgPSAkeG1sLmZpbmQoXCJncmFwaFwiKS5maXJzdCgpO1xuXG4gICAgJGdyYXBocy5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciAkZ3JhcGggPSAkKHRoaXMpO1xuXG4gICAgICByZW5kZXJOb2RlKCRncmFwaCwgbnVsbCk7XG5cbiAgICAgICRncmFwaC5maW5kKFwiZWRnZVwiKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyICRlZGdlID0gJCh0aGlzKTtcblxuICAgICAgICB2YXIgc2V0dGluZ3MgPSB7XG4gICAgICAgICAgZGF0YToge2lkOiAkZWRnZS5hdHRyKFwiaWRcIiksIHNvdXJjZTogJGVkZ2UuYXR0cihcInNvdXJjZVwiKSwgdGFyZ2V0OiAkZWRnZS5hdHRyKFwidGFyZ2V0XCIpfSxcbiAgICAgICAgICBjc3M6IHt9LFxuICAgICAgICAgIHBvc2l0aW9uOiB7fVxuICAgICAgICB9O1xuXG4gICAgICAgICRlZGdlLmZpbmQoJ2RhdGEnKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB2YXIgJGRhdGEgPSAkKHRoaXMpO1xuICAgICAgICAgIHNldHRpbmdzW1wiZGF0YVwiXVskZGF0YS5hdHRyKFwia2V5XCIpXSA9ICRkYXRhLnRleHQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY3kuYWRkKHtcbiAgICAgICAgICBncm91cDogXCJlZGdlc1wiLFxuICAgICAgICAgIGRhdGE6IHNldHRpbmdzLmRhdGEsXG4gICAgICAgICAgY3NzOiBzZXR0aW5ncy5jc3NcbiAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgIH0pO1xuICAgIHZhciBsYXlvdXRPcHRUID0gdHlwZW9mIG9wdGlvbnMubGF5b3V0Qnk7XG4gICAgaWYgKGxheW91dE9wdFQgPT0gXCJzdHJpbmdcIilcbiAgICAgICBjeS5sYXlvdXQoe25hbWU6IG9wdGlvbnMubGF5b3V0Qnl9KS5ydW4oKTtcbiAgICBlbHNlIGlmIChsYXlvdXRPcHRUID09IFwiZnVuY3Rpb25cIilcbiAgICAgIG9wdGlvbnMubGF5b3V0QnkoKTtcbiAgfSk7XG59O1xuIiwiO1xuKGZ1bmN0aW9uICgpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8vIHJlZ2lzdGVycyB0aGUgZXh0ZW5zaW9uIG9uIGEgY3l0b3NjYXBlIGxpYiByZWZcbiAgdmFyIHJlZ2lzdGVyID0gZnVuY3Rpb24gKGN5dG9zY2FwZSwgJCkge1xuXG4gICAgaWYgKCFjeXRvc2NhcGUgfHwgISQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9IC8vIGNhbid0IHJlZ2lzdGVyIGlmIGN5dG9zY2FwZSB1bnNwZWNpZmllZFxuXG4gICAgdmFyIGV4cG9ydGVyID0gcmVxdWlyZShcIi4vZXhwb3J0ZXJcIik7XG4gICAgdmFyIGltcG9ydGVyID0gcmVxdWlyZShcIi4vaW1wb3J0ZXJcIik7XG5cblxuICAgIHZhciBvcHRpb25zID0ge1xuICAgICAgbm9kZToge1xuICAgICAgICBjc3M6IGZhbHNlLFxuICAgICAgICBkYXRhOiB0cnVlLFxuICAgICAgICBwb3NpdGlvbjogdHJ1ZSxcbiAgICAgICAgZGlzY2x1ZGVkczogW11cbiAgICAgIH0sXG4gICAgICBlZGdlOiB7XG4gICAgICAgIGNzczogZmFsc2UsXG4gICAgICAgIGRhdGE6IHRydWUsXG4gICAgICAgIGRpc2NsdWRlZHM6IFtdXG4gICAgICB9LFxuICAgICAgbGF5b3V0Qnk6IFwiY29zZVwiIC8vIHN0cmluZyBvZiBsYXlvdXQgbmFtZSBvciBsYXlvdXQgZnVuY3Rpb25cbiAgICB9O1xuXG5cblxuICAgIGN5dG9zY2FwZSgnY29yZScsICdncmFwaG1sJywgZnVuY3Rpb24gKGN5R3JhcGhNTCkge1xuICAgICAgdmFyIGN5ID0gdGhpcztcbiAgICAgIHZhciByZXM7XG5cbiAgICAgIHN3aXRjaCAodHlwZW9mIGN5R3JhcGhNTCkge1xuICAgICAgICBjYXNlIFwic3RyaW5nXCI6IC8vIGltcG9ydFxuICAgICAgICAgIHJlcyA9IGltcG9ydGVyKGN5LCAkLCBvcHRpb25zLCBjeUdyYXBoTUwpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFwib2JqZWN0XCI6IC8vIHNldCBvcHRpb25zXG4gICAgICAgICAgJC5leHRlbmQodHJ1ZSwgb3B0aW9ucywgY3lHcmFwaE1MKTtcbiAgICAgICAgICByZXMgPSBjeTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBcInVuZGVmaW5lZFwiOiAvLyBleHBvcnRcbiAgICAgICAgICByZXMgPSBleHBvcnRlcihjeSwgJCwgb3B0aW9ucyk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgY29uc29sZS5sb2coXCJGdW5jdGlvbmFsaXR5KGFyZ3VtZW50KSBvZiAuZ3JhcGhtbCgpIGlzIG5vdCByZWNvZ25pemVkLlwiKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlcztcblxuICAgIH0pO1xuXG4gIH07XG5cbiAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7IC8vIGV4cG9zZSBhcyBhIGNvbW1vbmpzIG1vZHVsZVxuICAgIG1vZHVsZS5leHBvcnRzID0gcmVnaXN0ZXI7XG4gIH1cblxuICBpZiAodHlwZW9mIGRlZmluZSAhPT0gJ3VuZGVmaW5lZCcgJiYgZGVmaW5lLmFtZCkgeyAvLyBleHBvc2UgYXMgYW4gYW1kL3JlcXVpcmVqcyBtb2R1bGVcbiAgICBkZWZpbmUoJ2N5dG9zY2FwZS1ncmFwaG1sJywgZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIHJlZ2lzdGVyO1xuICAgIH0pO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBjeXRvc2NhcGUgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiAkICE9PSAndW5kZWZpbmVkJykgeyAvLyBleHBvc2UgdG8gZ2xvYmFsIGN5dG9zY2FwZSAoaS5lLiB3aW5kb3cuY3l0b3NjYXBlKVxuICAgIHJlZ2lzdGVyKGN5dG9zY2FwZSwgJCk7XG4gIH1cblxufSkoKTtcbiJdfQ==
