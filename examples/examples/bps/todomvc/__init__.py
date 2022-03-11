from os import path
from dataclasses import dataclass
from collections import OrderedDict
from uuid import uuid4, UUID
from flask import (
    Blueprint,
    render_template,
    request,
    redirect,
    url_for,
    send_from_directory
)
from wtforms import StringField, BooleanField, ValidationError
from wtforms.validators import InputRequired, Length
from flask_wtf import FlaskForm


class TodoForm(FlaskForm):
    completed = BooleanField('completed')
    text = StringField('text', validators=[InputRequired(),
                                           Length(min=2, max=20)])

    def validate_text(form, field):
        if field.data == '-1':
            raise ValidationError('Test error')


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


@bp.app_template_filter()
def todo_state(todos, state):
    if state == 'active':
        return [todo for todo in todos if not todo.completed]
    elif state == 'completed':
        return [todo for todo in todos if todo.completed]
    return todos


@bp.app_template_filter()
def todo_form(todo):
    form = TodoForm(formdata=None, prefix=str(todo.id), obj=todo)
    return form


@bp.app_context_processor
def state_processor():
    return dict(state=request.args.get('state'))


@bp.route('/', methods=['GET', 'POST'])
def index():
    todo_form = TodoForm(prefix='new_todo')
    if todo_form.validate_on_submit():
        id = uuid4()
        item = Todo(id=id, text=todo_form.text.data)
        todo_map[id] = item
        return redirect(url_for('.index', state=request.args.get('state')))
    if todo_form.errors:
        return render_template('todo_mvc_new_todo_input.html',
                               todo_form=todo_form,)

    return render_template('todo_mvc.html',
                           todos=todo_map.values(),
                           todo_form=todo_form,)


@bp.get('/filter')
def filter():
    todo_form = TodoForm(prefix='new_todo')
    return render_template('resp_filter.html',
                           todos=todo_map.values(),
                           todo_form=todo_form,)


@bp.post('/todo/<uuid:id>')
def update_item(id):
    form = TodoForm(prefix=str(id))
    if form.validate_on_submit():
        item = todo_map[id]
        form.populate_obj(item)
        return render_template('resp_update.html',
                               todos=todo_map.values(),)
    return render_template('todo_mvc_item.html',
                           todo=item,)


@bp.post('/todo/<uuid:id>/delete')
def delete_item(id):
    del todo_map[id]
    return render_template('resp_update.html',
                           todos=todo_map.values(),)


@bp.post('/toggle')
def toggle_all():
    completed = request.form.get('toggle') == 'on'
    for todo in todo_map.values():
        todo.completed = completed

    return render_template('resp_update.html',
                           todos=todo_map.values(),
                           toggle=completed)


@bp.post('/clear')
def clear():
    completed_ids = [k for k, v in todo_map.items() if v.completed]
    for id in completed_ids:
        del todo_map[id]

    return redirect(url_for('.index', state=request.args.get('state')))


@bp.route('/components/<path:filename>')
def components(filename):
    return send_from_directory(path.join(path.dirname(__file__), 'components'),
                               filename)
