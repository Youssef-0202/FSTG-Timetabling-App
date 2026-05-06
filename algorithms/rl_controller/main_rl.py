import os
import sys
import json
import time
from datetime import datetime

# Imports locaux
from data_manager import DataManager
from models import Schedule
from constraints import calculate_fitness_full
from engine_rl import HybridEngine
from agent import QLearningAgent
from reporting import print_generation_status, generate_final_report, initialize_log_file, HistoryLogger

# CONFIGURATION
POP_SIZE = 30
MAX_GEN = 100 # Pour test initial
MUTATION_RATE = 0.40
ELITISM = 2
SA_ITERATIONS = 400 # Reduit pour vitesse du test RL
SA_TEMP = 50.0
SA_COOLING = 0.965

CONSTRAINTS_MASK = {
    "H1": True, "H2": True, "H3": True, "H4": True, "H9": True, "H10": True, "H12": True,
    "S_GAPS": True, "S_LUNCH": True, "S_BALANCE": True, "S_STABILITY": True,
    "S_SHORT_DAY": True, "S_FREE_APM": True, "S_FATIGUE": True, "S_SATURDAY": True,
    "S_MIXING": True, "S_CM_DISPERSION": True
}

def run_rl_optimization():
    print("=" * 60)
    print(" [RL-CONTROLLER] - MASTER PFE OPTIMIZATION")
    print("=" * 60)

    dm = DataManager()
    if not dm.fetch_all_data():
        print("Erreur chargement donnees.")
        return

    db_stats = {
        "nb_teachers": len(dm.teachers),
        "nb_rooms": len(dm.rooms),
        "nb_sections": len(dm.sections),
        "nb_module_parts": len(dm.module_parts),
        "nb_slots": len(dm.timeslots)
    }
    params = {
        "POP_SIZE": POP_SIZE, "MAX_GEN": MAX_GEN, "MUTATION_RATE": MUTATION_RATE,
        "SA_ITERATIONS": SA_ITERATIONS, "SA_TEMP": SA_TEMP
    }

    initialize_log_file(params, db_stats)
    csv_logger = HistoryLogger(filename="rl_evolution_history.csv")
    
    # Initialisation de l agent
    agent = QLearningAgent(actions=[0, 1, 2, 3])
    
    start_time_exec = time.time()
    engine = HybridEngine(
        dm, 
        pop_size=POP_SIZE, 
        constraints_mask=CONSTRAINTS_MASK,
        mutation_rate=MUTATION_RATE,
        elitism=ELITISM,
        sa_iterations=SA_ITERATIONS,
        sa_temp=SA_TEMP,
        sa_cooling=SA_COOLING,
        agent=agent
    )

    print("\n[STEP 1] Generation de la population initiale...")
    engine.create_initial_population()
    
    init_score, init_h, init_soft, _ = calculate_fitness_full(engine.population[0], CONSTRAINTS_MASK)
    engine.population[0].h_violations = init_h
    engine.population[0].fitness = init_score

    print(f" Score Initial: {init_score} | H: {init_h}")

    print("\n[STEP 2] Debut de l evolution dirigee par RL...")
    for gen in range(1, MAX_GEN + 1):
        gen_start = time.time()
        
        sa_impact, diversity = engine.evolve()
        
        gen_dur = time.time() - gen_start
        best = engine.population[0]
        
        print_generation_status(gen, best, gen_dur, init_score, CONSTRAINTS_MASK)
        csv_logger.log(gen, best, gen_dur, mask=CONSTRAINTS_MASK, diversity=diversity, sa_impact=sa_impact)

    total_duration = time.time() - start_time_exec
    generate_final_report(engine, total_duration, init_score, CONSTRAINTS_MASK, actual_generations=gen)
    
    # Sauvegarde du savoir de l agent
    knowledge_path = os.path.join(os.path.dirname(__file__), "logs", "rl_knowledge.json")
    agent.save_knowledge(knowledge_path)
    print(f"\n[RL] Intelligence de l agent sauvegardee dans : {knowledge_path}")

if __name__ == "__main__":
    run_rl_optimization()
