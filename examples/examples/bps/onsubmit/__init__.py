from flask import Blueprint, render_template, request

bp = Blueprint('onsubmit', __name__, template_folder='.')
setattr(bp, 'display_name', 'onsubmit')


@bp.get('/')
def index():
    return render_template('onsubmit.html',
                           title='Replace by id',
                           name='world')


@bp.post('/')
def submit_form():
    name = request.form.get('name', 'world')
    return render_template('onsubmit.html',
                           title='Replace by id',
                           name=name)
