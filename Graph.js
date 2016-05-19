///<reference path="lib/collections.ts"/>
///<reference path="lib/node.d.ts"/>
/** Graph module
*
*  Types for generic A\* implementation.
*
*  *NB.* The only part of this module
*  that you should change is the `aStarSearch` function. Everything
*  else should be used as-is.
*/
var copy = collections.arrays.copy;
var isUndefined = collections.isUndefined;
//import {child} from "cluster";
/** An edge in a graph. */
var Edge = (function () {
    function Edge() {
    }
    return Edge;
})();
/** Type that reports the result of a search. */
var SearchResult = (function () {
    function SearchResult() {
    }
    return SearchResult;
})();
/**
* A\* search implementation, parameterised by a `Node` type. The code
* here is just a template; you should rewrite this function
* entirely. In this template, the code produces a dummy search result
* which just picks the first possible neighbour.
*
* Note that you should not change the API (type) of this function,
* only its body.
* @param graph The graph on which to perform A\* search.
* @param start The initial node.
* @param goal A function that returns true when given a goal node. Used to determine if the algorithm has reached the goal.
* @param heuristics The heuristic function. Used to estimate the cost of reaching the goal from a given Node.
* @param timeout Maximum time (in seconds) to spend performing A\* search.
* @returns A search result, which contains the path from `start` to a node satisfying `goal` and the cost of this path.
*/
function aStarSearch(graph, start, goal, heuristics, timeout) {
    // A dummy search result: it just picks the first possible neighbour
    var result = {
        path: [],
        cost: 0
    };
    var fScore = new collections.Dictionary();
    var gScore = new collections.Dictionary();
    // this dictionary keeps track of the best path's currently travelled
    var cameFrom = new collections.Dictionary();
    // we send in a compare function to prioritize in a correct manner
    var openList = new collections.PriorityQueue(function (a, b) {
        var c1 = fScore.getValue(a), c2 = fScore.getValue(b);
        // if the cost of a is less then b we prioritize it higher
        if (c1 < c2) {
            return 1;
        }
        else if (c1 > c2) {
            return -1;
        }
        return 0;
    });
    // We add these primarily for the .contains() call to work as expected
    // maybe a dictionary would be better here so we get an O(1) complexity instead when calling contains()
    var frontier = new collections.Set();
    var explored = new collections.Set();
    // Add start node
    gScore.setValue(start, 0);
    fScore.setValue(start, heuristics(start));
    openList.enqueue(start);
    while (!openList.isEmpty()) {
        var current = openList.dequeue();
        frontier.remove(current);
        explored.add(current);
        if (goal(current)) {
            // Goal found, reconstruct the path
            var node = current;
            while (cameFrom.containsKey(node)) {
                result.path.unshift(node);
                node = cameFrom.getValue(node);
            }
            // Set the final path cost
            result.cost = gScore.getValue(current);
            break;
        }
        // This holds a node's children
        var edges = graph.outgoingEdges(current);
        // Iterate through the node's children 
        for (var i = 0; i < edges.length; i++) {
            var child = edges[i].to;
            // There is a possibility that there's another way to this node, and if 
            // this is the case, ignore this node and continue with the next one
            if (explored.contains(child)) {
                continue;
            }
            var tempGScore = edges[i].cost + gScore.getValue(current);
            var tempFScore = tempGScore + heuristics(child);
            if (!frontier.contains(child)) {
                frontier.add(child);
                // NOTE: We have to add the f score to the node before we queue it in the open list
                // to make sure that it is sorted correctly
                fScore.setValue(child, tempFScore);
                openList.enqueue(child);
            }
            else if (tempGScore >= gScore.getValue(child)) {
                // if the cost of this path is more then the old one we continue to other children
                continue;
            }
            else
                fScore.setValue(child, tempFScore);
            cameFrom.setValue(child, current);
            gScore.setValue(child, tempGScore);
        }
    }
    return result;
}
//# sourceMappingURL=Graph.js.map