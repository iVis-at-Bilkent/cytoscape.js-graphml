module.exports = function(cy, $, options, cyGraphML) {
    
    cy.startBatch();
    
    // TODO: set $xml
    
    $graphs = $xml.find("graph");
    
    var collection = cy.collection();
    
    $graphs.each(function(i, $graph){
        
        $graph.find("node").each(function(i, $node){
            var settings = {
                data : { id: edge.attr("id") },
                css: { },
                position: { }
            };
            
            $node.find('data').each(function(ii, $data){

                settings[$data.attr("type")][$data.attr("key")] = $data.text();

            });
            
            collection.add({
                group: "nodes",
                data: settings.data,
                css: settings.css,
                position: settings.position
            });
        });

        $graph.find("edge").each(function(i, $edge){
            var settings = {
                data : { id: $edge.attr("id"), source: $edge.source().id(), target: $edge.target().id() },
                css: { },
                position: { }
            };
            
            $edge.find('data').each(function(ii, $data){

                settings[$data.attr("type")][$data.attr("key")] = $data.text();

            });
            
            collection.add({
                group: "edges",
                data: settings.data,
                css: settings.css
            });
        });
        
    });
    
    cy.add(collection);
    
    cy.endBatch();
};