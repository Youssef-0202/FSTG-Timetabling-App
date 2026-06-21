import random
import numpy as np
import json
import os

class QLearningAgent:
    """
    Agent RL utilisant le Q-Learning tabulaire pour choisir l heuristique optimale.
    """
    def __init__(self, actions, learning_rate=0.1, discount_factor=0.9, epsilon=0.1):
        self.actions = actions  # Liste d actions [0, 1, 2, 3] correspondants aux moves
        self.lr = learning_rate
        self.gamma = discount_factor
        self.epsilon = epsilon
        self.q_table = {} # Key: state_bundle (tuple), Value: dict of action scores
        self.last_td_error = 0.0
        self.total_rewards = 0.0

    def get_stats(self):
        """Retourne les métriques de santé de l agent."""
        return {
            "q_size": len(self.q_table),
            "last_td_error": self.last_td_error,
            "epsilon": self.epsilon
        }

    def _get_state_key(self, state_vector):
        """
        Discrétise le vecteur d état pour le rendre tabulaire.
        state_vector: [h_violations, s3_gaps, s6_stab, progress_norm]
        """
        # On arrondit ou on binne pour réduire l espace d état
        # h: 0 ou >0
        h_bin = 1 if state_vector[0] > 0 else 0
        # s3, s6: on divise par 500 pour grouper les intensités
        s3_bin = int(state_vector[1] // 500)
        s6_bin = int(state_vector[2] // 1000)
        # progress: 0 à 10 (par pas de 0.1)
        prog_bin = int(state_vector[3] * 10)
        
        return (h_bin, s3_bin, s6_bin, prog_bin)

    def choose_action(self, state_vector):
        """Exploration vs Exploitation (Epsilon-Greedy)."""
        if random.random() < self.epsilon:
            return random.choice(self.actions)
        
        state_key = self._get_state_key(state_vector)
        if state_key not in self.q_table:
            self.q_table[state_key] = {a: 0.0 for a in self.actions}
            
        # Argmax
        return max(self.q_table[state_key], key=self.q_table[state_key].get)

    def learn(self, state, action, reward, next_state):
        """Met à jour la Q-Table selon l équation de Bellman."""
        state_key = self._get_state_key(state)
        next_state_key = self._get_state_key(next_state)
        self.total_rewards += reward
        
        if state_key not in self.q_table:
            self.q_table[state_key] = {a: 0.0 for a in self.actions}
        if next_state_key not in self.q_table:
            self.q_table[next_state_key] = {a: 0.0 for a in self.actions}
            
        # Target
        max_next_q = max(self.q_table[next_state_key].values())
        td_target = reward + self.gamma * max_next_q
        td_error = td_target - self.q_table[state_key][action]
        self.last_td_error = abs(td_error)
        
        # Update
        self.q_table[state_key][action] += self.lr * td_error

    def save_knowledge(self, filepath):
        # On convertit les tuples de clés en strings pour JSON
        serializable_q = {str(k): v for k, v in self.q_table.items()}
        with open(filepath, 'w') as f:
            json.dump(serializable_q, f)

    def load_knowledge(self, filepath):
        if os.path.exists(filepath):
            with open(filepath, 'r') as f:
                data = json.load(f)
                # On reconvertit les strings en tuples si nécessaire (ou on garde en string)
                self.q_table = {eval(k): v for k, v in data.items()}
