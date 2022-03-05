from os import listdir, path
from importlib import import_module
from flask import Flask, render_template, send_from_directory

app = Flask(__name__)
app.debug = True

blueprints_path = path.join(path.dirname(__file__), 'examples', 'bps')

bps = listdir(blueprints_path)

examples = []
for bp_name in bps:
    module = import_module(f'examples.bps.{bp_name}')
    print(module.bp)
    app.register_blueprint(module.bp, url_prefix=f'/{bp_name}')
    examples.append(module.bp)


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
