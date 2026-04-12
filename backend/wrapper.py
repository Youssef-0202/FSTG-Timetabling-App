import traceback
import sys
import os

try:
    print("--- Démarrage du wrapper de diagnostic ---")
    import import_real_data
    import_real_data.import_all()
except Exception as e:
    print("\n🔥 ERREUR DÉTECTÉE ! Voici la pile d'appels complète :\n")
    traceback.print_exc()
    sys.exit(1)
