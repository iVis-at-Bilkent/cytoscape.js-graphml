module.exports = function(cy, $, options, cyGraphML) {
    function renderNode($graph){
        $graph.find("node").each(function () {
            var $node = $(this);
            
            var settings = {
                data: {id: $node.attr("id")},
                css: {},
                position: {}
            };

            $node.find('data').each(function () {
                var $data = $(this);

                settings[$data.attr("type")][$data.attr("key")] = $data.text();

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
            })
        });
    }

    cy.batch(function () {
        xml = $.parseXML(cyGraphML);
        $xml = $(xml);

        $graphs = $xml.find("graph");

        var collection = cy.collection();

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

                    settings[$data.attr("type")][$data.attr("key")] = $data.text();

                });

                cy.add({
                    group: "edges",
                    data: settings.data,
                    css: settings.css
                });
            });

        });
        cy.add(collection);
        cy.layout({name: "cose"});
    });
};