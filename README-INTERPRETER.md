### Team AI Caramba || Group No. 13 || 3rd Submission ###
---
Group Members:

	* Andreas Mikko
	* Emmanuel Batis
	* Jonatan Lind
	* Mathias Bylund
	
Description:

	The interpretCommand function is pretty straight-forward; we start by checking if there is no specified location, 
	this means that we can create a goal in which the arm is just holding that object. If the location is the floor,
	then we can always place an object there. 
	
	Then we check for physical laws relations (e.g. a large object cannot be placed on top of a smaller one). Physical
	laws has been moved to a separate module. Because the laws are not the interpreters responsibillity to define. It 
	should only use the laws. It is also helpful since the laws are also needed by other modules.
	
	Afterwards it is just a matter of validating the objects and their spatial relations.
	
	It is worth noting that we modified the interpret function to validate the returned interpretation, otherwise
	a null return would make some tests fail. We also added a few more test cases that have parses with nested objects 
	and locations. 
	
