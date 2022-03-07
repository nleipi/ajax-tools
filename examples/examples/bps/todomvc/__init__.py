from dataclasses import dataclass
from collections import OrderedDict
from uuid import uuid4, UUID
from flask import Blueprint, render_template, request, redirect, url_for
from wtforms import StringField
from wtforms.validators import InputRequired, Length
from flask_wtf import FlaskForm


class TodoForm(FlaskForm):
    text = StringField('text', validators=[InputRequired(),
                                           Length(min=2, max=20)])


@dataclass
class Todo():
    id: UUID
    text: str
    completed: bool = False


bp = Blueprint('todo_mvc',
               __name__,
               template_folder='.',
               static_folder='node_modules',)

setattr(bp, 'display_name', 'TodoMVC')

todo_map = OrderedDict()


@bp.get('/')
def index():
    todo_form = TodoForm()
    return render_template('todo_mvc.html',
                           todos=todo_map.values(),
                           todo_form=todo_form,)


@bp.post('/')
def add_todo():
    todo_form = TodoForm()
    if todo_form.validate_on_submit():
        id = uuid4()
        item = Todo(id=id, text=todo_form.text.data)
        todo_map[id] = item
        todo_form.text.data = ''
        print(request.args)
        if len(todo_map) > 1:
            return render_template('resp_add_todo_item.html',
                                   todo_form=todo_form,
                                   todo=item,
                                   todos=todo_map.values())
        return redirect(url_for('.index'))

    return render_template('todo_form.html',
                           todo_form=todo_form,)


@bp.get('/filter')
def filter():
    return render_template('resp_filter.html',
                           todos=todo_map.values(),)


@bp.post('/todo/<uuid:id>')
def update(id):
    item = todo_map[id]
    if 'delete' in request.form:
        del todo_map[id]
        if len(todo_map) > 0:
            return render_template('resp_remove_todo_item.html',
                                   todo=item,
                                   todos=todo_map.values())
        return redirect(url_for('.index'))
    if 'toggle' in request.form:
        item.completed = not item.completed
        return render_template('todo_item.html',
                               todo=item,)


@bp.app_template_filter()
def todo_state(todos, state):
    print(todos, state)
    if state == 'active':
        return [todo for todo in todos if not todo.completed]
    elif state == 'completed':
        return [todo for todo in todos if todo.completed]
    return todos


@bp.app_context_processor
def state_processor():
    return dict(state=request.args.get('state'))
