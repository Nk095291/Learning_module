### abstraction philosophy

avoid exposing details to the client which he doesn't need to know about. 

the less info client has about the implementation, the better it is. 



Note : only require and return classes that you own. 


units of code should be small in all dimensions including class dependencies.


#### problem with class extention : 

existing class -> add code -> become more complex

create new class -> inject dependency -> become more coupled class 



NOTE : if the class grow too large and have many dependency it's better to divide it.


#### UserRole in Day2 incubyte_blog

Problem: `BlogsService.remove` used to delete any blog by id. Putting role rules there as `if (user.role === 'admin') ... else if ...` would dump every user type into the blogs service. Each new role would grow that method.

Abstraction: a `UserRole` interface with one question, `canDeleteBlog(blog)`. Admin / premium / free each implement it. `createUserRole(user)` is the only switch. `BlogsService` loads the actor, wraps them, and asks the interface — it does not know admin vs free rules.

- Admin can delete any blog
- Free and premium can delete only their own (`actor.id === blog.authorId`)

Premium is its own class even though delete matches free, so a later premium-only rule does not change `BlogsService`.

Call: `DELETE /blogs/:id?actorId=1` 