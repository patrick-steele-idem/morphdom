var morphdom = require('../../');
var todosTemplate = require('./todos.marko');
var nextId = 0;

var todos = [
    { title: 'Wake up', visible: true, id: nextId++ },
    { title: 'Eat', visible: true, id: nextId++ },
    { title: 'Drink', visible: true, id: nextId++ },
    { title: 'Sleep', visible: true, id: nextId++ }
];

function updateDOM() {
    var todosHtml = todosTemplate.renderSync({ todos: todos });
    morphdom(document.getElementById('todos'), todosHtml, {
        onNodeAdded: function(el) {
            if (el.className === 'todo') {
                setTimeout(function() {
                    el.className += ' todo-visible';
                }, 10);
            }
        },
        onBeforeNodeDiscarded: function(el) {
            if (el.className === 'todo todo-visible') {
                el.className = 'todo';

                setTimeout(function() {
                    el.parentNode.removeChild(el);
                }, 400);

                // Prevent the node from being discarded so that we can fade it out
                return false;
            }
        }
    });
}

window.handleTodoFormSubmit = function(event) {
    var inputEl = document.getElementById('todoInput');
    var newTodo = { title: inputEl.value, visible: false, id: nextId++ };
    inputEl.value = '';
    todos.push(newTodo);
    updateDOM();
    newTodo.visible = true; // Make sure it renders as visible the next time
    event.preventDefault();
};

window.handleRemoveTodoClick = function(el) {
    var todoId = parseInt(el.getAttribute('data-id'));
    todos = todos.filter(function(todo) {
        return todo.id !== todoId;
    });
    updateDOM();
};

updateDOM();