from flask import Blueprint, render_template, request

bp = Blueprint('onclick_data_href', __name__, template_folder='.')
setattr(bp, 'display_name', 'onclick with data-href')


@bp.get('/')
def index():
    name = request.args.get('name', 'world')
    return render_template('onclick_data_href.html',
                           title='Replace by id',
                           name=name)
