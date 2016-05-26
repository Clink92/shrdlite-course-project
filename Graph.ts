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
import Dictionary = collections.Dictionary;
import PriorityQueue = collections.PriorityQueue;


/** An edge in a graph. */
class Edge<Node> {
    from : Node;
    to   : Node;
    cost : number;
    action: string;
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
    /** The action performed to get to this node **/
    actions: string[];
}


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
function aStarSearch<Node> (
    graph : Graph<Node>,
    start : Node,
    goal : (n:Node) => boolean,
    heuristics : (n:Node) => number,
    timeout : number
) : SearchResult<Node> 
{
    var result : SearchResult<Node> = 
	{
        path: [],
        cost: 0,
        actions: []
    };

    let startTime: number = Date.now();
    let deltaTime: number = 0;

    var fScore : Dictionary<string, number> = new Dictionary<string, number>();
    var gScore : Dictionary<string, number> = new Dictionary<string, number>();
	
    // this dictionary keeps track of the best path's currently travelled
    var cameFrom : Dictionary<string, {node: Node, action: string}>= new Dictionary<string, {node: Node, action: string}>();

    // we send in a compare function to prioritize in a correct manner
    var openList : PriorityQueue<Node> = new PriorityQueue<Node>(function(a : Node, b : Node)
	{
        var c1 : number = fScore.getValue(JSON.stringify(a)),
            c2 : number = fScore.getValue(JSON.stringify(b));

        // if the cost of a is less then b we prioritize it higher
        if(c1 < c2){
            return 1;
        }
        else if(c1 > c2){
            return -1;
        }

        return 0;
    });

	
    // We add these primarily for the .contains() call to work as expected
    var frontier : Dictionary<string, Node> = new Dictionary<string, Node>();
	var explored : Dictionary<string, Node> = new Dictionary<string, Node>();
    
	// Add start node
    gScore.setValue(JSON.stringify(start), 0);
    fScore.setValue(JSON.stringify(start), heuristics(start));
    openList.enqueue(start);

    while(!openList.isEmpty() && (deltaTime * 0.001) < timeout)
    {
        console.log("TOP OF WHILE");
        var current : Node = openList.dequeue();
        let currentKey: string = JSON.stringify(current);
        console.log("Current node: ", current);

        frontier.remove(currentKey);
        explored.setValue(currentKey, current);

        if(goal(current))
		{
            console.log("FOUND GOAL");
            // Goal found, reconstruct the path
            let node: Node = current;
            let key: string = JSON.stringify(node);
            let cf: {node: Node, action: string};

            console.log("Reconstructing path");
            while(cameFrom.containsKey(key))
			{
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
        var edges : Edge<Node>[] = graph.outgoingEdges(current);
        console.log("EDGES", edges);

		// Iterate through the node's children
        for(var i : number = 0; i < edges.length; i++)
		{
            console.log("checking outgoing edges");
            var child : Node = edges[i].to;
            let childKey: string = JSON.stringify(child);

			// There is a possibility that there's another way to this node, and if
			// this is the case, ignore this node and continue with the next one
            if(explored.containsKey(childKey))
			{
                continue;
            }

            var tempGScore : number = edges[i].cost + gScore.getValue(currentKey);
            console.log("GSCORE", tempGScore);
            var tempFScore : number = tempGScore + heuristics(child);

            if(!frontier.containsKey(childKey)){
                console.log("ADDING CHILD");
                frontier.setValue(childKey, child);

				// NOTE: We have to add the f score to the node before we queue it in the open list
				// to make sure that it is sorted correctly
                fScore.setValue(childKey, tempFScore);
                openList.enqueue(child);
            }
            else if (tempGScore >= gScore.getValue(childKey))
			{
                // if the cost of this path is more then the old one we continue to other children
                continue;
            }
            else fScore.setValue(childKey, tempFScore);
            
            cameFrom.setValue(childKey, {node: current, action: edges[i].action});
            gScore.setValue(childKey, tempGScore);
        }

        deltaTime = Date.now() - startTime;
	}

    return result;
}