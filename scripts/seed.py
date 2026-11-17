"""Normalize the organizer workbook without third-party Python packages."""
import json
import pathlib
import posixpath
import re
import xml.etree.ElementTree as ET
from zipfile import ZipFile

root = pathlib.Path(__file__).resolve().parents[1]
ns = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
rel = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'

with ZipFile(root / 'Du_lieu_mau_Vibe_Coding_bangA.xlsx') as workbook:
    def xml(path):
        return ET.fromstring(workbook.read(path))

    strings = [''.join(node.itertext()) for node in xml('xl/sharedStrings.xml')]

    def rows(sheet):
        for row in xml(f'xl/worksheets/sheet{sheet}.xml').findall('.//m:row', ns):
            if int(row.get('r')) <= 4:
                continue
            cells = {}
            for cell in row:
                value = cell.findtext('m:v', default='', namespaces=ns)
                cells[re.match('[A-Z]+', cell.get('r')).group()] = strings[int(value)] if cell.get('t') == 's' else value
            if cells.get('A'):
                yield cells

    members = {}
    for row in rows(2):
        assert row['A'] == row['I']
        members[row['A']] = dict(code=row['A'], fullName=row['B'], phone=row['C'], openingPoints=int(row['D']), points=int(row['E']), status='active', joinedAt=row['H'])
    history = {row['G']: row['A'] for row in rows(5)}
    ledger = [
        dict(txCode=r['A'], memberCode=r['C'], type='earn' if int(r['F']) > 0 else 'redeem',
             createdAt=r['D'].replace(' ', 'T') + ':00+07:00', amountVnd=int(r['E']),
             delta=int(r['F']), balanceAfter=int(r['G']), note=r['H'], legacyHistoryId=history[r['A']])
        for r in rows(3)
    ]
    rewards = [
        dict(code=r['A'], name=r['B'], description=r['C'], costPoints=int(r['D']), active=True, kind='voucher' if i < 2 else 'gift', sortOrder=i,
             **({'valueVnd': int(re.sub(r'\D', '', r['B']))} if i < 2 else {}))
        for i, r in enumerate(rows(4))
    ]
    cases = [dict(id=r['A'], title=r['B'], member=r['C'], reference=r['D'], amount=int(r.get('E') or 0), expected=r['G']) for r in rows(6)]
    dest = root / 'src/data/seed.json'
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(dict(members=members, ledger=ledger, rewards=rewards, cases=cases), indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

    sheet = xml('xl/worksheets/sheet7.xml')
    drawing_id = sheet.find('m:drawing', ns).get(rel + 'id')
    sheet_rels = {r.get('Id'): r.get('Target') for r in xml('xl/worksheets/_rels/sheet7.xml.rels')}
    drawing_path = posixpath.normpath(posixpath.join('xl/worksheets', sheet_rels[drawing_id]))
    folder, filename = posixpath.split(drawing_path)
    image_rels = {r.get('Id'): r.get('Target') for r in xml(f'{folder}/_rels/{filename}.rels')}
    codes = [row['A'] for row in rows(7)]
    dest = root / 'public/sample-qr'
    dest.mkdir(parents=True, exist_ok=True)
    for anchor in xml(drawing_path):
        position = anchor.find('{*}from')
        blip = anchor.find('.//{*}blip')
        if position is None or blip is None:
            continue
        code = codes[int(position.findtext('{*}row')) - 4]
        source = posixpath.normpath(posixpath.join(folder, image_rels[blip.get(rel + 'embed')]))
        (dest / (code + '.png')).write_bytes(workbook.read(source))
