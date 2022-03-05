from flask import Blueprint, render_template, request

bp = Blueprint('onsubmit', __name__, template_folder='.')
setattr(bp, 'display_name', 'onsubmit')


@bp.get('/')
def index():
    print(request.args)
    name = request.args.get('name', 'world')
    return render_template('onsubmit.html',
                           title='Replace by id',
                           name=name)
