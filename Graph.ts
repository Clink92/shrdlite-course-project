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

import copy = collections.arrays.copy;
import isUndefined = collections.isUndefined;
/** An edge in a graph. */
class Edge<Node> {
    from : Node;
    to   : Node;
    cost : number;
}

/** A directed graph. */
interface Graph<Node> {
    /** Computes the edges that leave from a node. */
    outgoingEdges(node : Node) : Edge<Node>[];
    /** A function that compares nodes. */
    compareNodes : collections.ICompareFunction<Node>;
}

/** Type that reports the result of a search. */
class SearchResult<Node> {
    /** The path (sequence of Nodes) found by the search algorithm. */
    path : Node[];
    /** The total cost of the path. */
    cost : number;
}


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
function aStarSearch<Node> (
    graph : Graph<Node>,
    start : Node,
    goal : (n:Node) => boolean,
    heuristics : (n:Node) => number,
    timeout : number
) : SearchResult<Node> 
{
    // A dummy search result: it just picks the first possible neighbour
    var result : SearchResult<Node> = 
	{
        path: [],
        cost: 0
    };

    var fScore = new collections.Dictionary<Node, number>();
    var gScore = new collections.Dictionary<Node, number>();
    // this dictionary keeps track of the best path's currently travelled
    var cameFrom = new collections.LinkedDictionary<Node, Node>();

    // we send in a compare function to prioritize in a correct manner
    var openList = new collections.PriorityQueue<Node>(function(a, b){
        var c1 = fScore.getValue(a),
            c2 = fScore.getValue(b);

        // if the cost of a is less then b we prioritize it higher
        if(c1 < c2)
            return 1;
        else if(c1 > c2)
            return -1;
        return 0;
    });

    // We add these primarily for the .contains() call to work as expected
    // maybe a dictionary would be better here so we get an O(1) complexity instead when calling contains()
    var frontier = new collections.Set<Node>();
	var explored = new collections.Set<Node>();
    
	// Add start node
    gScore.setValue(start, 0);
    fScore.setValue(start, heuristics(start));
    openList.enqueue(start);

    while(!openList.isEmpty())
    {
        var current = openList.dequeue();

        frontier.remove(current);
        explored.add(current);

        if(goal(current)) {
            // Goal found, reconstruct the path
            var cf = current;
            var hasNext:boolean = true;
            
            while(hasNext){
                // Andreas: Simplified this reconstruction of the path
                result.path.unshift(cf);
                hasNext = cameFrom.containsKey(cf);
                if(hasNext)
                    cf = cameFrom.getValue(cf);
            }

            // cool dudes make stupid hacks.. apparently we do not expect the start node as a part of the path!
            // Andreas: Why? It passes the tests without this
            //result.path.shift();

            // Set the final path cost
            result.cost = gScore.getValue(current);

            break;
        }

        var edges :Edge<Node>[] = graph.outgoingEdges(current);

        for(var i:number = 0; i < edges.length; i++){
            var child:Node = edges[i].to;

            if(explored.contains(child)){
                continue;
            }

            // Andreas: Remove this if-statement? Don't see why it is needed. Just do the calculation.
            //if(gScore.containsKey(current)){
                var tempCost:number = edges[i].cost + gScore.getValue(current);
            //}

            // According to splendid sources an unknown gScore should equal to infinity, since we are not Buzz Lightyear
            // we pause and reflect on our life choices...
            //else var tempCost:number = 9999999999999999;
            
            if(!(frontier.contains(child))){
                frontier.add(child);
                openList.enqueue(child);
            }
            else if (tempCost >= gScore.getValue(child)) {
                // if the cost of this path is more then the old one we continue to other children
                continue;
            }

            cameFrom.setValue(child, current);
            gScore.setValue(child, tempCost);
            fScore.setValue(child, (tempCost + heuristics(child)));
        }

	}

    return result;
}