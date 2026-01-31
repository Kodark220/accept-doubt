# runner: python3
# { "Depends": "py-genlayer:test" }
import gl
from typing import Dict, List, Optional, Any


class AppealOrAcceptGame(gl.Contract):
    """
    Intelligent Contract for Appeal or Accept Game
    Demonstrates Optimistic Democracy with AI consensus
    """

    class Scenario:
        """Represents a game scenario"""
        def __init__(self, question: str, option_a: str, option_b: str, category: str, context: str = ""):
            self.question = question
            self.option_a = option_a
            self.option_b = option_b
            self.category = category
            self.context = context

    class RoundResult:
        """Represents results from a single round"""
        def __init__(self, scenario_id: str, initial_ruling: str, final_ruling: str,
                     appeal_triggered: bool, validator_count: int):
            self.scenario_id = scenario_id
            self.initial_ruling = initial_ruling
            self.final_ruling = final_ruling
            self.appeal_triggered = appeal_triggered
            self.validator_count = validator_count

    class GameData:
        """Represents a game session"""
        def __init__(self, game_id: str, player_count: int):
            self.game_id = game_id
            self.player_count = player_count
            self.current_round = 0
            self.player_scores: Dict[str, int] = {}
            self.round_history: List['AppealOrAcceptGame.RoundResult'] = []

    def __init__(self):
        """Initialize contract state"""
        self.games: Dict[str, 'AppealOrAcceptGame.GameData'] = {}
        self.scenarios: Dict[str, 'AppealOrAcceptGame.Scenario'] = {}

    @gl.public.write
    def create_game(self, game_id: str, player_count: int) -> bool:
        """Create new session."""
        if not game_id or game_id in self.games:
            return False
        if player_count < 1 or player_count > 200:
            return False
        self.games[game_id] = self.GameData(game_id, player_count)
        return True

    @gl.public.write
    def seed_scenario(
        self,
        scenario_id: str,
        question: str,
        option_a: str,
        option_b: str,
        category: str,
        context: str = ""
    ) -> bool:
        """Add scenario metadata to the contract."""
        if not scenario_id or scenario_id in self.scenarios:
            return False
        if not question or not option_a or not option_b:
            return False
        self.scenarios[scenario_id] = self.Scenario(question, option_a, option_b, category, context)
        return True

    async def _run_validators(self, prompt: str, validator_count: int) -> str:
        """Internal helper to run AI validators."""
        result = await gl.exec_prompt(
            prompt=prompt,
            eq_outputs={
                "output_type": "string",
                "mode": "majority"
            },
            leader_receipt={
                "num_validators": validator_count
            }
        )
        ruling = result.strip().upper()
        return ruling if ruling in ["A", "B"] else "A"

    @gl.public.write
    async def evaluate_scenario_initial(
        self,
        scenario_id: str
    ) -> Dict[str, Any]:
        """Initial ruling using 5 validators. Must be @gl.public.write because it calls gl.exec_prompt."""
        scenario = self.scenarios.get(scenario_id)
        if scenario is None:
            return {"error": "scenario not found", "ruling": None}
        prompt = f"""You are an AI validator evaluating an "Appeal or Accept" scenario.

Question: {scenario.question}

Option A: {scenario.option_a}

Option B: {scenario.option_b}

{f"Context: {scenario.context}" if scenario.context else ""}

Respond with ONLY 'A' or 'B'. No explanation."""
        ruling = await self._run_validators(prompt, 5)
        return {"ruling": ruling, "validator_count": 5, "method": "initial_optimistic"}

    @gl.public.write
    async def evaluate_scenario_appeal(self, scenario_id: str) -> Dict[str, Any]:
        """Appeal ruling with 50 validators. Must be @gl.public.write because it calls gl.exec_prompt."""
        scenario = self.scenarios.get(scenario_id)
        if scenario is None:
            return {"error": "scenario not found", "ruling": None}
        prompt = f"""You are an AI validator in an escalated appeal.

Question: {scenario.question}

Option A: {scenario.option_a}

Option B: {scenario.option_b}

{f"Context: {scenario.context}" if scenario.context else ""}

Respond with ONLY 'A' or 'B'."""
        ruling = await self._run_validators(prompt, 50)
        return {"ruling": ruling, "validator_count": 50, "method": "appeal_escalated"}

    @gl.public.write
    def record_round_result(
        self,
        game_id: str,
        scenario_id: str,
        initial_ruling: str,
        final_ruling: str,
        appeal_triggered: bool,
        validator_count: int
    ) -> bool:
        """Store finalized round data."""
        game = self.games.get(game_id)
        if game is None:
            return False
        if initial_ruling not in ["A", "B"] or final_ruling not in ["A", "B"]:
            return False
        game.round_history.append(self.RoundResult(
            scenario_id, initial_ruling, final_ruling, appeal_triggered, validator_count
        ))
        game.current_round += 1
        return True

    @gl.public.write
    def update_player_score(self, game_id: str, player_id: str, points: int) -> bool:
        """Adjust player points tracked on-chain."""
        game = self.games.get(game_id)
        if game is None or not player_id:
            return False
        game.player_scores[player_id] = game.player_scores.get(player_id, 0) + points
        return True

    @gl.public.view
    def get_game_state(self, game_id: str) -> Optional[Dict[str, Any]]:
        """Return the current state of a game."""
        game = self.games.get(game_id)
        if not game:
            return None
        return {
            "game_id": game.game_id,
            "player_count": game.player_count,
            "current_round": game.current_round,
            "player_scores": game.player_scores,
            "round_history": [
                {
                    "scenario_id": r.scenario_id,
                    "initial_ruling": r.initial_ruling,
                    "final_ruling": r.final_ruling,
                    "appeal_triggered": r.appeal_triggered,
                    "validator_count": r.validator_count
                }
                for r in game.round_history
            ]
        }

    @gl.public.view
    def calculate_xp_distribution(self, game_id: str) -> Dict[str, int]:
        """Return XP awards for each player."""
        game = self.games.get(game_id)
        if not game:
            return {}
        sorted_players = sorted(game.player_scores.items(), key=lambda x: x[1], reverse=True)
        xp_values = [1000, 750, 500, 400, 300, 250, 200, 150, 100, 50]
        return {
            player_id: xp_values[i] if i < len(xp_values) else 25
            for i, (player_id, _) in enumerate(sorted_players)
        }

    @gl.public.view
    def get_scenario(self, scenario_id: str) -> Optional[Dict[str, Any]]:
        """Fetch a specific scenario."""
        scenario = self.scenarios.get(scenario_id)
        if not scenario:
            return None
        return {
            "scenario_id": scenario_id,
            "question": scenario.question,
            "option_a": scenario.option_a,
            "option_b": scenario.option_b,
            "category": scenario.category,
            "context": scenario.context
        }

    @gl.public.view
    def list_scenarios(self) -> List[str]:
        """List IDs of all seeded scenarios."""
        return list(self.scenarios.keys())

    @gl.public.view
    def list_games(self) -> List[str]:
        """List IDs of active games."""
        return list(self.games.keys())
