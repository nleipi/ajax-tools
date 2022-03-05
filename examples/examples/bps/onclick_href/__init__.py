from time import sleep
from flask import Blueprint, render_template, request

bp = Blueprint('onclick_href', __name__, template_folder='.')
setattr(bp, 'display_name', 'onclick with href')


@bp.get('/')
def index():
    name = request.args.get('name', 'world')
    sleep(2)
    return render_template('onclick_href.html',
                           title='Replace by id',
                           name=name)
