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
var Dictionary = collections.Dictionary;
var PriorityQueue = collections.PriorityQueue;
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
 *
* Note that you should not change the API (type) of this function,
* only its body.
 *
 *
* @param graph The graph on which to perform A\* search.
* @param start The initial node.
* @param goal A function that returns true when given a goal node. Used to determine if the algorithm has reached the goal.
* @param heuristics The heuristic function. Used to estimate the cost of reaching the goal from a given Node.
* @param timeout Maximum time (in seconds) to spend performing A\* search.
* @returns A search result, which contains the path from `start` to a node satisfying `goal` and the cost of this path.
*/
function aStarSearch(graph, start, goal, heuristics, timeout) {
    var result = {
        path: [],
        cost: 0,
        actions: []
    };
    var startTime = Date.now();
    var deltaTime = 0;
    var fScore = new Dictionary();
    var gScore = new Dictionary();
    // this dictionary keeps track of the best path's currently travelled
    var cameFrom = new Dictionary();
    // we send in a compare function to prioritize in a correct manner
    var openList = new PriorityQueue(function (a, b) {
        var c1 = fScore.getValue(JSON.stringify(a)), c2 = fScore.getValue(JSON.stringify(b));
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
    var frontier = new Dictionary();
    var explored = new Dictionary();
    // Add start node
    gScore.setValue(JSON.stringify(start), 0);
    fScore.setValue(JSON.stringify(start), heuristics(start));
    openList.enqueue(start);
    while (!openList.isEmpty() && (deltaTime * 0.001) < timeout) {
        var current = openList.dequeue();
        var currentKey = JSON.stringify(current);
        frontier.remove(currentKey);
        explored.setValue(currentKey, current);
        if (goal(current)) {
            // Goal found, reconstruct the path
            var node = current;
            var key = JSON.stringify(node);
            var cf = void 0;
            while (cameFrom.containsKey(key)) {
                cf = cameFrom.getValue(key);
                node = cf.node;
                key = JSON.stringify(node);
                result.path.unshift(cf.node);
                result.actions.unshift(cf.action);
            }
            // Set the final path cost
            result.cost = gScore.getValue(currentKey);
            break;
        }
        // This holds a node's children
        var edges = graph.outgoingEdges(current);
        // Iterate through the node's children
        for (var i = 0; i < edges.length; i++) {
            var child = edges[i].to;
            var childKey = JSON.stringify(child);
            // There is a possibility that there's another way to this node, and if
            // this is the case, ignore this node and continue with the next one
            if (explored.containsKey(childKey)) {
                continue;
            }
            var tempGScore = edges[i].cost + gScore.getValue(currentKey);
            var tempFScore = tempGScore + heuristics(child);
            if (!frontier.containsKey(childKey)) {
                frontier.setValue(childKey, child);
                openList.enqueue(child);
                // NOTE: We have to add the f score to the node before we queue it in the open list
                // to make sure that it is sorted correctly
                fScore.setValue(childKey, tempFScore);
            }
            else if (tempGScore >= gScore.getValue(childKey)) {
                // if the cost of this path is more then the old one we continue to other children
                continue;
            }
            else
                fScore.setValue(childKey, tempFScore);
            cameFrom.setValue(childKey, { node: current, action: edges[i].action });
            gScore.setValue(childKey, tempGScore);
        }
        deltaTime = Date.now() - startTime;
    }
    return result;
}
//# sourceMappingURL=Graph.js.map