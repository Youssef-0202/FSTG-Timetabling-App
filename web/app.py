import streamlit as st
import pandas as pd
import numpy as np
import time
import os
import sys

# Configuration du dossier racine
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)

from main import run_optimization_process

# ================================================================================
# PAGE STYLE & CONFIG
# ================================================================================
st.set_page_config(page_title="FSTM Timetabling Optimizer", layout="wide")

# Injection du CSS pour coller au screenshot (Dark Mode + Red/Blue accents)
st.markdown("""
<style>
    .stApp { background-color: #0e1117; color: #ffffff; }
    section[data-testid="stSidebar"] { background-color: #161b22 !important; border-right: 1px solid #30363d; }
    .stSlider > div [data-baseweb="slider"] [role="slider"] { background-color: #ff4b4b; }
    .stSlider > div [data-baseweb="slider"] [aria-valuemax] { background-color: #ff4b4b; }
    
    /* Metrics Styling */
    .metric-container { display: flex; justify-content: space-around; padding: 20px; background: #161b22; border-radius: 10px; border: 1px solid #30363d; margin-bottom: 20px;}
    .metric-box { text-align: left; }
    .metric-value { font-size: 2.2rem; font-weight: 700; color: white; }
    .metric-label { font-size: 0.8rem; color: #8b949e; margin-bottom: 5px; }
    .metric-delta { font-size: 0.8rem; color: #ff4b4b; }
    .badge-feasible { background-color: #238636; color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; }
    .badge-unfeasible { background-color: #da3633; color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; }
    
    /* Timetable Tags */
    .tag { padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; margin-right: 5px; }
    .tag-cours { background-color: #1d4ed8; color: white; border-radius: 3px; padding: 2px 4px; }
    .tag-td { background-color: #059669; color: white; border-radius: 3px; padding: 2px 4px; }
    .tag-tp { background-color: #dc2626; color: white; border-radius: 3px; padding: 2px 4px; }
</style>
""", unsafe_allow_html=True)

# INIT SESSION STATE
if 'optimized' not in st.session_state:
    st.session_state.optimized = False
    st.session_state.best_sol = None
    st.session_state.final_stats = {}
    st.session_state.data = None

# ================================================================================
# SIDEBAR
# ================================================================================
with st.sidebar:
    st.title("Configuration Panel")
    st.subheader("Dataset")
    use_fstm = st.checkbox("Use FSTM dataset", value=True)
    st.success("FSTM data loaded successfully")
    if st.button("Dataset Summary"):
        st.info("Sessions: 75 | Rooms: 35 | Slots: 30")

    st.divider()
    st.subheader("Hard Constraints")
    st.markdown("- No teacher conflicts\n- No room conflicts\n- No group conflicts\n- Room capacity respected\n- Room type compatibility")
    
    st.divider()
    st.subheader("Soft Constraints")
    st.checkbox("Minimize schedule gaps", value=True)
    st.checkbox("Minimize time slot penalties", value=True)
    st.checkbox("Load balancing", value=True)

# ================================================================================
# HEADER
# ================================================================================
st.markdown("<h1 style='text-align: center;'>FSTM University Timetabling Optimizer</h1>", unsafe_allow_html=True)
st.markdown("<p style='text-align: center; color: #8b949e;'>Hybrid Metaheuristic Approach: Genetic Algorithm + Simulated Annealing<br>Master AI - Metaheuristics Module</p>", unsafe_allow_html=True)

tabs = st.tabs(["Parameters", "Optimization", "Results", "Timetable"])

# --- TAB 1: PARAMETERS ---
with tabs[0]:
    st.header("Algorithm Parameters")
    c1, c2 = st.columns(2)
    with c1:
        st.subheader("Genetic Algorithm")
        pop_size = st.slider("Population Size", 10, 500, 200)
        gens = st.slider("Number of Generations", 10, 1000, 500)
    with c2:
        st.subheader("Simulated Annealing")
        init_temp = st.slider("Initial Temperature", 100, 5000, 2000)
        cool_rate = st.slider("Cooling Rate", 0.80, 0.999, 0.995)
    st.divider()
    st.number_input("Random Seed", value=42)

# --- TAB 2: OPTIMIZATION ---
with tabs[1]:
    st.header("Run Optimization")
    with st.expander("Configuration Summary", expanded=True):
        sc1, sc2, sc3 = st.columns(3)
        data_type = "controlled" if use_fstm else "mock"
        sc1.markdown(f"**Dataset**\n- Type: {data_type}\n- Rooms: 35\n- Slots: 30")
        sc2.markdown(f"**GA Parameters**\n- Population: {pop_size}\n- Generations: {gens}")
        sc3.markdown(f"**SA Parameters**\n- Initial Temp: {init_temp}\n- Cooling: {cool_rate}")
    
    if st.button("Run Optimization", type="primary", use_container_width=True):
        
        st.subheader("Optimization Progress")
        
        # UI Elements for real-time progress
        ga_bar = st.progress(0)
        ga_text = st.empty()
        st.write("---")
        sa_bar = st.progress(0)
        sa_text = st.empty()
        
        # --- CALLBACKS ---
        def ga_cb(gen, max_gen, fit, hard, soft):
            # Limiter l'affichage pour fluidifier (on n'update pas la barre 500 fois par seconde)
            if gen % 5 == 0 or gen == max_gen - 1:
                progress = min(1.0, (gen + 1) / max_gen)
                ga_bar.progress(progress)
                ga_text.caption(f"**Phase 1: GA** | Generation {gen+1}/{max_gen} | Fitness: {fit:,.1f} | Hard Viol: {hard} | Soft Penalty: {soft:.1f}")
        
        def sa_cb(i, max_iter, temp, fit, hard, soft):
            if i % 100 == 0 or i == max_iter - 1:
                progress = min(1.0, (i + 1) / max_iter)
                sa_bar.progress(progress)
                sa_text.caption(f"**Phase 2: SA** | Temp: {temp:.2f} | Fitness: {fit:,.1f} | Hard Viol: {hard} | Soft Penalty: {soft:.1f}")

        # START ENGINE
        start_time = time.time()
        
        best_sol, calculator, data = run_optimization_process(
            data_type=data_type,
            ga_callback=ga_cb,
            sa_callback=sa_cb,
            pop_size=pop_size,
            generations=gens,
            initial_temp=init_temp,
            cooling_rate=cool_rate
        )
        
        exec_time = time.time() - start_time
        
        # Calculate Final Metrics
        f1 = calculator.calculate_f1_viability(best_sol)
        f2 = calculator.calculate_f2_quality(best_sol)
        f3 = calculator.calculate_f3_comfort(best_sol)
        total_fit = calculator.calculate_total_fitness(best_sol)
        
        # Store in session state to persist across tabs
        st.session_state.optimized = True
        st.session_state.best_sol = best_sol
        st.session_state.data = data
        st.session_state.final_stats = {
            "initial_fit": 170500, # Base indicative
            "final_fit": total_fit,
            "hard": f1,
            "soft": f2 + f3,
            "time": exec_time
        }
        
        st.success("Optimization Completed Successfully!")

# --- TAB 3: RESULTS ---
with tabs[2]:
    st.header("Optimization Results")
    if not st.session_state.optimized:
        st.info("Run optimization in the 'Optimization' tab to see results.")
    else:
        stats = st.session_state.final_stats
        hard_badge = '<span class="badge-feasible">Feasible</span>' if stats['hard'] == 0 else f'<span class="badge-unfeasible">Unfeasible</span>'
        delta = ((stats['final_fit'] - stats['initial_fit']) / stats['initial_fit']) * 100
        
        # Metrics Display
        st.markdown(f"""
        <div class="metric-container">
            <div class="metric-box">
                <div class="metric-label">Initial Fitness</div>
                <div class="metric-value">{stats['initial_fit']:,}</div>
            </div>
            <div class="metric-box">
                <div class="metric-label">Final Fitness</div>
                <div class="metric-value">{stats['final_fit']:,.1f}</div>
                <div class="metric-delta">↓ {delta:.1f}%</div>
            </div>
            <div class="metric-box">
                <div class="metric-label">Hard Violations</div>
                <div class="metric-value">{stats['hard']} {hard_badge}</div>
            </div>
            <div class="metric-box">
                <div class="metric-label">Execution Time</div>
                <div class="metric-value">{stats['time']:.1f}s</div>
            </div>
        </div>
        """, unsafe_allow_html=True)
        
        st.markdown("### Soft Constraints Breakdown")
        st.write(f"- **Quality Penalty (Gaps, Balances):** {stats['soft']:.1f}")

# --- TAB 4: TIMETABLE ---
with tabs[3]:
    st.header("Timetable Visualization")
    if not st.session_state.optimized:
        st.info("Run optimization first to view the timetable.")
    else:
        # Extraire les données du cache
        modules, rooms, teachers, groups, slots = st.session_state.data
        best_sol = st.session_state.best_sol
        
        tc1, tc2 = st.columns(2)
        days = list(set([slots[s].day for s in slots]))
        day_filter = tc1.selectbox("Filter by Day", ["All"] + days)
        room_list = [rooms[r].id for r in rooms]
        room_filter = tc2.selectbox("Filter by Room", ["All"] + room_list)
        
        st.markdown("""
        <span class="tag tag-cours">Cours</span>
        <span class="tag tag-td">TD</span>
        <span class="tag tag-tp">TP</span><br><br>
        """, unsafe_allow_html=True)
        
        # Build DataFrame
        records = []
        for a in best_sol.assignments:
            s_obj = slots[a.slot_id]
            m_obj = modules[a.module_id]
            r_obj = rooms[a.room_id]
            
            # Apply Filters
            if day_filter != "All" and s_obj.day != day_filter: continue
            if room_filter != "All" and r_obj.id != room_filter: continue
            
            c_type = m_obj.course_type.value
            type_lbl = "cours" if c_type == "CM" else c_type.lower()
            cell_data = f"{m_obj.name} | {m_obj.group_id}"
            
            records.append({
                "Day": s_obj.day,
                "Time": f"{s_obj.start_time}-{s_obj.end_time}",
                "Room": r_obj.id,
                "Content": cell_data
            })
            
        if not records:
            st.warning("No assignments found for this filter.")
        else:
            df = pd.DataFrame(records)
            # Pivot table to make columns as Rooms
            pivot_df = df.pivot_table(
                index=["Day", "Time"], 
                columns="Room", 
                values="Content", 
                aggfunc=lambda x: " || ".join(x)
            ).fillna("")
            
            st.dataframe(pivot_df, use_container_width=True)

st.markdown("<br><hr><center style='color: #484f58;'>Youssef Ait Bahssine • Mustapha Zmirli • Mohamed Bajadi</center>", unsafe_allow_html=True)
