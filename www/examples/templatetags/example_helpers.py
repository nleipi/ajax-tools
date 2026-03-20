from django import template
from django.utils.html import escape
from django.utils.safestring import mark_safe

register = template.Library()

@register.filter('code')
def code(value):
    escaped = mark_safe(escape(value))
    print(escaped)
    lines = []
    for line in escaped.splitlines():
        if line.strip() == '':
            continue
        if line.startswith('--'):
            line = f"<del>{line}</del>"
        elif line.startswith('++'):
            line = f"<ins>{line}</ins>"
        print((len(line), line))
        lines.append(line)
    return '\n'.join(lines)
