from flask import Blueprint, render_template, request

bp = Blueprint('diff',
               __name__,
               template_folder='.',
               static_folder='static',)
setattr(bp, 'display_name', 'Diff')


@bp.route('/', methods=['GET', 'POST'])
def index():
    param = request.form.get('param', '')
    return render_template('diff.html',
                           title='Diff',
                           param=param)
