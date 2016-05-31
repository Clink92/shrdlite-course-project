### Team AI Caramba || Group No. 13 || 3nd Submission ###
---
Group Members:

	* Andreas Mikko
	* Emmanuel Batis
	* Jonatan Lind
	* Mathias Bylund
	
Description:

	The interpretCommand function is pretty straight-forward; we start by checking if there is no specified location, 
	this means that we can create a goal in which the arm is just holding that object. If the location is the floor,
	then we can always place an object there. Then we check for physical laws relations (e.g. a large object cannot
	be placed on top of a smaller one). Afterwards it is just a matter of validating the objects and their spatial relations.
	
	It is worth noting that we modified the interpret function to validate the returned interpretation, otherwise
	a null return would make some tests fail. We also added a few more test cases that have parses with nested objects and locations. 
	
