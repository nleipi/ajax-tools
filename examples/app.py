from os import listdir, path
from secrets import token_urlsafe
from importlib import import_module
from flask import (
    Flask,
    render_template,
    send_from_directory,
    g,
    session,
    request
)

app = Flask(__name__)
app.secret_key = 'developer'

blueprints_path = path.join(path.dirname(__file__), 'examples', 'bps')

bps = listdir(blueprints_path)

examples = []
for bp_name in bps:
    module = import_module(f'examples.bps.{bp_name}')
    app.register_blueprint(module.bp, url_prefix=f'/{bp_name}')
    examples.append(module.bp)


@app.context_processor
def nonce():
    if 'nonce' in request.args:
        return dict(nonce=request.args.get('nonce'))
    if 'nonce' not in g:
        g.nonce = token_urlsafe(16)
    return dict(nonce=g.get('nonce'))


@app.get('/')
def index():
    return render_template(
        'index.html',
        title='AJT examples',
        examples=examples,
    )


@app.route('/lib/<path:filename>')
def lib(filename):
    return send_from_directory(path.join('..', 'lib'), filename)
