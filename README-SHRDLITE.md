### Team AI Caramba || Group No. 13  ###
---
Group Members:

	* Andreas Mikko
	* Emmanuel Batis
	* Jonatan Lind
	* Mathias Bylund
	
Description:
	
	- Planner.ts -
	
		The planner starts with filtering out the possible null references present in the stacks.Why 
		there can be null references in the stacks is unknown. Finding the bug became to time consuming 
		and filtering became the simplest solution. It is possible that the bug resides in the shrdlite 
		code base.
		
		Ambiguity is handeled in the planner by simply taking the first best interpretation.
		
		The huristic is based on the fact that we must pick up the object we desire to move. In order to
		pick it up, the arm must move to the correct stack. Every object that lies above must also be 
		moved out of the way first. Should it already hold the object, it must at least put it down.
		
		The heuristic works best when dealing with deep stacks. Hence it tends to be slow in the medium 
		medium world. Since the stacks there are shallow and spread far apart.
	
	- WorldGraph.ts -
	
		Module containing the WorldGraph class which is the graph that the a* search is performed on.
		The garph consists of WorldNodes that describe the world state. The world state consists of
		the contents of the stacks, the arm's position and what the arm is holding.
		
		Outgoing edges from a node corresponds to the actions the arm can make.
	
	- Interpreter.ts -
	
		Interpreter finds the potential objects and if there is a location it will find those potential
		objects as well. Then it will return those objects with their relation given by the parser.
	
	- PhysicalLaws.ts -
	
		This module contains the physical laws of the world and variables for size, form and relations.
		These were earlier defined in the interpreter. They were refactored into their own module since 
		they were needed other modules as well.
		
	- Graph.ts -
	
		Actions have been added to the edges and to the search result returned by a*. This makes it easier for
		the planner since it can use the info in the SearchResult directly to set up the plan for the arm.