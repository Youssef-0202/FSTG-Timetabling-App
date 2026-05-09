import sys
import os
from dagster import Definitions, load_assets_from_modules

# On ajoute le dossier courant au path pour que les imports locaux fonctionnent
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Maintenant on peut importer assets.py
import assets

all_assets = load_assets_from_modules([assets])

defs = Definitions(
    assets=all_assets,
)
