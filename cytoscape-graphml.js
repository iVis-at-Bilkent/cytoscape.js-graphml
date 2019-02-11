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
          if ($.inArray(key, options[type].discludeds) < 0)
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
      ele.children().each(function (i, child) {
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
  function renderNode($graph) {
    $graph.find("node").each(function () {
      var $node = $(this);

      var settings = {
        data: {id: $node.attr("id")},
        css: {},
        position: {}
      };

      $node.find('data').each(function () {
        var $data = $(this);
        settings["data"][$data.attr("key")] = $data.text();
      });

      cy.add({
        group: "nodes",
        data: settings.data,
        css: settings.css,
        position: settings.position
      });

      $node.find("graph").each(function () {
        var $graph = $(this);

        renderNode($graph);
      });
    });
  }

  cy.batch(function () {
    xml = $.parseXML(cyGraphML);
    $xml = $(xml);

    $graphs = $xml.find("graph");

    $graphs.each(function () {
      var $graph = $(this);

      renderNode($graph);

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
       cy.layout({name: options.layoutBy});
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

//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvZXhwb3J0ZXIuanMiLCJzcmMvaW1wb3J0ZXIuanMiLCJzcmMvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChjeSwgJCwgb3B0aW9ucykge1xuXG4gIGZ1bmN0aW9uIHhtbFRvU3RyaW5nKHhtbERhdGEpIHtcblxuICAgIHZhciB4bWxTdHJpbmc7XG4gICAgLy9JRVxuICAgIGlmICh3aW5kb3cuQWN0aXZlWE9iamVjdCkge1xuICAgICAgeG1sU3RyaW5nID0geG1sRGF0YS54bWw7XG4gICAgfVxuICAgIC8vIGNvZGUgZm9yIE1vemlsbGEsIEZpcmVmb3gsIE9wZXJhLCBldGMuXG4gICAgZWxzZSB7XG4gICAgICB4bWxTdHJpbmcgPSAobmV3IFhNTFNlcmlhbGl6ZXIoKSkuc2VyaWFsaXplVG9TdHJpbmcoeG1sRGF0YSk7XG4gICAgfVxuICAgIHJldHVybiB4bWxTdHJpbmc7XG4gIH1cblxuXG4gIGZ1bmN0aW9uIGdldEVsZURhdGEoZWxlKSB7XG4gICAgdmFyIHR5cGUgPSBlbGUuaXNOb2RlKCkgPyBcIm5vZGVcIiA6IFwiZWRnZVwiO1xuICAgIHZhciBhdHRycyA9IFtcImNzc1wiLCBcImRhdGFcIiwgXCJwb3NpdGlvblwiXTtcbiAgICB2YXIgcmVzdWx0ID0ge307XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGF0dHJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgYXR0ciA9IGF0dHJzW2ldO1xuICAgICAgdmFyIG9wdCA9IG9wdGlvbnNbdHlwZV1bYXR0cl07XG4gICAgICBpZiAoIW9wdClcbiAgICAgICAgcmVzdWx0W2F0dHJdID0ge307XG4gICAgICBlbHNlIGlmICgkLmlzQXJyYXkob3B0KSkge1xuICAgICAgICByZXN1bHRbYXR0cl0gPSB7fTtcbiAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBvcHQubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICB2YXIgZWwgPSBvcHRbaV07XG4gICAgICAgICAgaWYgKGVsZVthdHRyXShlbCkpXG4gICAgICAgICAgICByZXN1bHRbYXR0cl1bZWxdID0gZWxlW2F0dHJdKGVsKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGVsZUF0dHIgPSBlbGVbYXR0cl0oKTtcbiAgICAgICAgcmVzdWx0W2F0dHJdID0ge307XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBlbGVBdHRyKVxuICAgICAgICAgIGlmICgkLmluQXJyYXkoa2V5LCBvcHRpb25zW3R5cGVdLmRpc2NsdWRlZHMpIDwgMClcbiAgICAgICAgICAgIHJlc3VsdFthdHRyXVtrZXldID0ge3ZhbHVlOiBlbGVBdHRyW2tleV0sIGF0dHJUeXBlOiBhdHRyfTtcblxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiAkLmV4dGVuZChyZXN1bHQuY3NzLCByZXN1bHQuZGF0YSwgcmVzdWx0LnBvc2l0aW9uKTtcbiAgfVxuXG5cbiAgZnVuY3Rpb24gcGFyc2VOb2RlKGVsZSwgeG1sKSB7XG4gICAgdmFyIG5vZGUgPSAkKCc8bm9kZSAvPicsIHhtbCkuYXR0cih7aWQ6IGVsZS5pZCgpfSkuYXBwZW5kVG8oeG1sKTtcblxuICAgIHZhciBlbGVEYXRhID0gZ2V0RWxlRGF0YShlbGUpO1xuICAgIGZvciAodmFyIGtleSBpbiBlbGVEYXRhKVxuICAgICAgJCgnPGRhdGEgLz4nLCBub2RlKS5hdHRyKHt0eXBlOiBlbGVEYXRhW2tleV0uYXR0clR5cGUsIGtleToga2V5fSkudGV4dChlbGVEYXRhW2tleV0udmFsdWUpLmFwcGVuZFRvKG5vZGUpO1xuXG5cbiAgICBpZiAoZWxlLmlzUGFyZW50KCkpIHtcbiAgICAgIHZhciBzdWJncmFwaCA9ICQoJzxncmFwaCAvPicsIG5vZGUpLmF0dHIoe2lkOiBlbGUuaWQoKSArICc6J30pLmFwcGVuZFRvKG5vZGUpO1xuICAgICAgZWxlLmNoaWxkcmVuKCkuZWFjaChmdW5jdGlvbiAoaSwgY2hpbGQpIHtcbiAgICAgICAgcGFyc2VOb2RlKGNoaWxkLCBzdWJncmFwaCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gbm9kZTtcbiAgfVxuXG5cbiAgb3B0aW9ucy5ub2RlLmRpc2NsdWRlZHMucHVzaChcImlkXCIpO1xuICBvcHRpb25zLmVkZ2UuZGlzY2x1ZGVkcy5wdXNoKFwiaWRcIiwgXCJzb3VyY2VcIiwgXCJ0YXJnZXRcIik7XG5cbiAgdmFyIHhtbERvYyA9ICQucGFyc2VYTUwoXG4gICAgICAgICAgJzw/eG1sIHZlcnNpb249XCIxLjBcIiBlbmNvZGluZz1cIlVURi04XCI/PlxcbicgK1xuICAgICAgICAgICc8Z3JhcGhtbCB4bWxucz1cImh0dHA6Ly9ncmFwaG1sLmdyYXBoZHJhd2luZy5vcmcveG1sbnNcIlxcbicgK1xuICAgICAgICAgICd4bWxuczp4c2k9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYS1pbnN0YW5jZVwiXFxuJyArXG4gICAgICAgICAgJ3hzaTpzY2hlbWFMb2NhdGlvbj1cImh0dHA6Ly9ncmFwaG1sLmdyYXBoZHJhd2luZy5vcmcveG1sbnNcXG4nICtcbiAgICAgICAgICAnaHR0cDovL2dyYXBobWwuZ3JhcGhkcmF3aW5nLm9yZy94bWxucy8xLjAvZ3JhcGhtbC54c2RcIj5cXG4nICtcbiAgICAgICAgICAnICA8Z3JhcGg+XFxuJyArXG4gICAgICAgICAgJyA8L2dyYXBoPlxcbicgK1xuICAgICAgICAgICcgPC9ncmFwaG1sPlxcbidcbiAgICAgICAgICApO1xuICB2YXIgJHhtbCA9ICQoeG1sRG9jKTtcblxuICB2YXIgJGdyYXBoID0gJHhtbC5maW5kKFwiZ3JhcGhcIik7XG5cbiAgY3kubm9kZXMoKS5vcnBoYW5zKCkuZm9yRWFjaChmdW5jdGlvbiAoZWxlKSB7XG4gICAgcGFyc2VOb2RlKGVsZSwgJGdyYXBoKTtcbiAgfSk7XG5cbiAgY3kuZWRnZXMoKS5mb3JFYWNoKGZ1bmN0aW9uIChlbGUpIHtcblxuICAgIHZhciBlZGdlID0gJCgnPGVkZ2UgLz4nLCAkZ3JhcGgpLmF0dHIoe2lkOiBlbGUuaWQoKSwgc291cmNlOiBlbGUuc291cmNlKCkuaWQoKSwgdGFyZ2V0OiBlbGUudGFyZ2V0KCkuaWQoKX0pLmFwcGVuZFRvKCRncmFwaCk7XG5cbiAgICB2YXIgZWxlRGF0YSA9IGdldEVsZURhdGEoZWxlKTtcbiAgICBmb3IgKHZhciBrZXkgaW4gZWxlRGF0YSlcbiAgICAgICQoJzxkYXRhIC8+JywgZWRnZSkuYXR0cih7a2V5OiBrZXl9KS50ZXh0KGVsZURhdGFba2V5XS52YWx1ZSkuYXBwZW5kVG8oZWRnZSk7XG5cbiAgfSk7XG5cblxuICByZXR1cm4geG1sVG9TdHJpbmcoeG1sRG9jKTtcbn07IiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoY3ksICQsIG9wdGlvbnMsIGN5R3JhcGhNTCkge1xuICBmdW5jdGlvbiByZW5kZXJOb2RlKCRncmFwaCkge1xuICAgICRncmFwaC5maW5kKFwibm9kZVwiKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciAkbm9kZSA9ICQodGhpcyk7XG5cbiAgICAgIHZhciBzZXR0aW5ncyA9IHtcbiAgICAgICAgZGF0YToge2lkOiAkbm9kZS5hdHRyKFwiaWRcIil9LFxuICAgICAgICBjc3M6IHt9LFxuICAgICAgICBwb3NpdGlvbjoge31cbiAgICAgIH07XG5cbiAgICAgICRub2RlLmZpbmQoJ2RhdGEnKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyICRkYXRhID0gJCh0aGlzKTtcbiAgICAgICAgc2V0dGluZ3NbXCJkYXRhXCJdWyRkYXRhLmF0dHIoXCJrZXlcIildID0gJGRhdGEudGV4dCgpO1xuICAgICAgfSk7XG5cbiAgICAgIGN5LmFkZCh7XG4gICAgICAgIGdyb3VwOiBcIm5vZGVzXCIsXG4gICAgICAgIGRhdGE6IHNldHRpbmdzLmRhdGEsXG4gICAgICAgIGNzczogc2V0dGluZ3MuY3NzLFxuICAgICAgICBwb3NpdGlvbjogc2V0dGluZ3MucG9zaXRpb25cbiAgICAgIH0pO1xuXG4gICAgICAkbm9kZS5maW5kKFwiZ3JhcGhcIikuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciAkZ3JhcGggPSAkKHRoaXMpO1xuXG4gICAgICAgIHJlbmRlck5vZGUoJGdyYXBoKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgY3kuYmF0Y2goZnVuY3Rpb24gKCkge1xuICAgIHhtbCA9ICQucGFyc2VYTUwoY3lHcmFwaE1MKTtcbiAgICAkeG1sID0gJCh4bWwpO1xuXG4gICAgJGdyYXBocyA9ICR4bWwuZmluZChcImdyYXBoXCIpO1xuXG4gICAgJGdyYXBocy5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciAkZ3JhcGggPSAkKHRoaXMpO1xuXG4gICAgICByZW5kZXJOb2RlKCRncmFwaCk7XG5cbiAgICAgICRncmFwaC5maW5kKFwiZWRnZVwiKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyICRlZGdlID0gJCh0aGlzKTtcblxuICAgICAgICB2YXIgc2V0dGluZ3MgPSB7XG4gICAgICAgICAgZGF0YToge2lkOiAkZWRnZS5hdHRyKFwiaWRcIiksIHNvdXJjZTogJGVkZ2UuYXR0cihcInNvdXJjZVwiKSwgdGFyZ2V0OiAkZWRnZS5hdHRyKFwidGFyZ2V0XCIpfSxcbiAgICAgICAgICBjc3M6IHt9LFxuICAgICAgICAgIHBvc2l0aW9uOiB7fVxuICAgICAgICB9O1xuXG4gICAgICAgICRlZGdlLmZpbmQoJ2RhdGEnKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB2YXIgJGRhdGEgPSAkKHRoaXMpO1xuICAgICAgICAgIHNldHRpbmdzW1wiZGF0YVwiXVskZGF0YS5hdHRyKFwia2V5XCIpXSA9ICRkYXRhLnRleHQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY3kuYWRkKHtcbiAgICAgICAgICBncm91cDogXCJlZGdlc1wiLFxuICAgICAgICAgIGRhdGE6IHNldHRpbmdzLmRhdGEsXG4gICAgICAgICAgY3NzOiBzZXR0aW5ncy5jc3NcbiAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgIH0pO1xuICAgIHZhciBsYXlvdXRPcHRUID0gdHlwZW9mIG9wdGlvbnMubGF5b3V0Qnk7XG4gICAgaWYgKGxheW91dE9wdFQgPT0gXCJzdHJpbmdcIilcbiAgICAgICBjeS5sYXlvdXQoe25hbWU6IG9wdGlvbnMubGF5b3V0Qnl9KTtcbiAgICBlbHNlIGlmIChsYXlvdXRPcHRUID09IFwiZnVuY3Rpb25cIilcbiAgICAgIG9wdGlvbnMubGF5b3V0QnkoKTtcbiAgfSk7XG59O1xuIiwiO1xuKGZ1bmN0aW9uICgpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8vIHJlZ2lzdGVycyB0aGUgZXh0ZW5zaW9uIG9uIGEgY3l0b3NjYXBlIGxpYiByZWZcbiAgdmFyIHJlZ2lzdGVyID0gZnVuY3Rpb24gKGN5dG9zY2FwZSwgJCkge1xuXG4gICAgaWYgKCFjeXRvc2NhcGUgfHwgISQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9IC8vIGNhbid0IHJlZ2lzdGVyIGlmIGN5dG9zY2FwZSB1bnNwZWNpZmllZFxuXG4gICAgdmFyIGV4cG9ydGVyID0gcmVxdWlyZShcIi4vZXhwb3J0ZXJcIik7XG4gICAgdmFyIGltcG9ydGVyID0gcmVxdWlyZShcIi4vaW1wb3J0ZXJcIik7XG5cblxuICAgIHZhciBvcHRpb25zID0ge1xuICAgICAgbm9kZToge1xuICAgICAgICBjc3M6IGZhbHNlLFxuICAgICAgICBkYXRhOiB0cnVlLFxuICAgICAgICBwb3NpdGlvbjogdHJ1ZSxcbiAgICAgICAgZGlzY2x1ZGVkczogW11cbiAgICAgIH0sXG4gICAgICBlZGdlOiB7XG4gICAgICAgIGNzczogZmFsc2UsXG4gICAgICAgIGRhdGE6IHRydWUsXG4gICAgICAgIGRpc2NsdWRlZHM6IFtdXG4gICAgICB9LFxuICAgICAgbGF5b3V0Qnk6IFwiY29zZVwiIC8vIHN0cmluZyBvZiBsYXlvdXQgbmFtZSBvciBsYXlvdXQgZnVuY3Rpb25cbiAgICB9O1xuXG5cblxuICAgIGN5dG9zY2FwZSgnY29yZScsICdncmFwaG1sJywgZnVuY3Rpb24gKGN5R3JhcGhNTCkge1xuICAgICAgdmFyIGN5ID0gdGhpcztcbiAgICAgIHZhciByZXM7XG5cbiAgICAgIHN3aXRjaCAodHlwZW9mIGN5R3JhcGhNTCkge1xuICAgICAgICBjYXNlIFwic3RyaW5nXCI6IC8vIGltcG9ydFxuICAgICAgICAgIHJlcyA9IGltcG9ydGVyKGN5LCAkLCBvcHRpb25zLCBjeUdyYXBoTUwpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFwib2JqZWN0XCI6IC8vIHNldCBvcHRpb25zXG4gICAgICAgICAgJC5leHRlbmQodHJ1ZSwgb3B0aW9ucywgY3lHcmFwaE1MKTtcbiAgICAgICAgICByZXMgPSBjeTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBcInVuZGVmaW5lZFwiOiAvLyBleHBvcnRcbiAgICAgICAgICByZXMgPSBleHBvcnRlcihjeSwgJCwgb3B0aW9ucyk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgY29uc29sZS5sb2coXCJGdW5jdGlvbmFsaXR5KGFyZ3VtZW50KSBvZiAuZ3JhcGhtbCgpIGlzIG5vdCByZWNvZ25pemVkLlwiKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlcztcblxuICAgIH0pO1xuXG4gIH07XG5cbiAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7IC8vIGV4cG9zZSBhcyBhIGNvbW1vbmpzIG1vZHVsZVxuICAgIG1vZHVsZS5leHBvcnRzID0gcmVnaXN0ZXI7XG4gIH1cblxuICBpZiAodHlwZW9mIGRlZmluZSAhPT0gJ3VuZGVmaW5lZCcgJiYgZGVmaW5lLmFtZCkgeyAvLyBleHBvc2UgYXMgYW4gYW1kL3JlcXVpcmVqcyBtb2R1bGVcbiAgICBkZWZpbmUoJ2N5dG9zY2FwZS1ncmFwaG1sJywgZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIHJlZ2lzdGVyO1xuICAgIH0pO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBjeXRvc2NhcGUgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiAkICE9PSAndW5kZWZpbmVkJykgeyAvLyBleHBvc2UgdG8gZ2xvYmFsIGN5dG9zY2FwZSAoaS5lLiB3aW5kb3cuY3l0b3NjYXBlKVxuICAgIHJlZ2lzdGVyKGN5dG9zY2FwZSwgJCk7XG4gIH1cblxufSkoKTtcbiJdfQ==
