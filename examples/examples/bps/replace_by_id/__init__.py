from flask import Blueprint, render_template, request

bp = Blueprint('replace_by_id', __name__, template_folder='.')
setattr(bp, 'display_name', 'Replace by id')


@bp.get('/')
def index():
    name = request.args.get('name', 'world')
    return render_template('replace_by_id.html',
                           title='Replace by id',
                           name=name)
