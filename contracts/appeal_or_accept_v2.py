# { "Depends": "py-genlayer:test" }
from genlayer import *
import json


class AppealOrAcceptGame(gl.Contract):
    """
    Intelligent Contract for the Appeal or Accept game.
    Uses simple string storage to avoid nested TreeMap issues.
    """
    
    # Persistent storage - flat string maps (JSON-encoded values)
    scenario_data: TreeMap[str, str]
    evaluation_data: TreeMap[str, str]

    def __init__(self):
        """Initialize contract storage."""
        self.scenario_data = TreeMap[str, str]()
        self.evaluation_data = TreeMap[str, str]()

    @gl.public.write
    def seed_scenario(
        self,
        scenario_id: str,
        question: str,
        option_a: str,
        option_b: str,
        category: str,
        context: str
    ) -> bool:
        """Register a new scenario for evaluation."""
        if not scenario_id or scenario_id in self.scenario_data:
            return False
        if not question or not option_a or not option_b:
            return False
        
        # Store as pipe-separated string
        data = f"{question}|{option_a}|{option_b}|{category}|{context}"
        self.scenario_data[scenario_id] = data
        return True

    @gl.public.view
    def get_scenario(self, scenario_id: str) -> str:
        """Get scenario details by ID."""
        if scenario_id not in self.scenario_data:
            return "error:scenario not found"
        return self.scenario_data[scenario_id]

    @gl.public.write
    def evaluate_initial(self, scenario_id: str) -> str:
        """Initial evaluation with AI validators."""
        if scenario_id not in self.scenario_data:
            return "error:scenario not found"
        
        # Parse stored scenario
        data = self.scenario_data[scenario_id]
        parts = data.split("|")
        question = parts[0] if len(parts) > 0 else ""
        option_a = parts[1] if len(parts) > 1 else ""
        option_b = parts[2] if len(parts) > 2 else ""
        category = parts[3] if len(parts) > 3 else ""
        
        prompt = f"""You are an AI validator. Evaluate if this claim is TRUE or FALSE.

CLAIM: {question}

Option A: {option_a} (TRUE)
Option B: {option_b} (FALSE)

Category: {category}

Respond using ONLY the following JSON format:
{{"ruling": "A" or "B"}}
Your output must be only JSON without any formatting prefix or suffix."""

        def get_ruling():
            result = gl.nondet.exec_prompt(prompt)
            result = result.replace("```json", "").replace("```", "").strip()
            return result

        result = gl.eq_principle.prompt_comparative(
            get_ruling, "The value of ruling has to match"
        )
        
        try:
            parsed = json.loads(result)
            ruling = parsed.get("ruling", "A").upper()
        except:
            ruling = "A"
        
        if ruling not in ["A", "B"]:
            ruling = "A"
        
        # Store evaluation
        self.evaluation_data[scenario_id] = f"{ruling}|5|initial"
        
        return f"ruling:{ruling}|validator_count:5|method:initial_optimistic"

    @gl.public.write
    def evaluate_appeal(self, scenario_id: str) -> str:
        """Appeal evaluation with more validators."""
        if scenario_id not in self.scenario_data:
            return "error:scenario not found"
        
        # Parse stored scenario
        data = self.scenario_data[scenario_id]
        parts = data.split("|")
        question = parts[0] if len(parts) > 0 else ""
        option_a = parts[1] if len(parts) > 1 else ""
        option_b = parts[2] if len(parts) > 2 else ""
        category = parts[3] if len(parts) > 3 else ""
        
        # Get previous ruling
        previous_ruling = ""
        if scenario_id in self.evaluation_data:
            prev_parts = self.evaluation_data[scenario_id].split("|")
            previous_ruling = prev_parts[0] if prev_parts else ""
        
        prompt = f"""You are an AI validator in an APPEAL. Evaluate carefully.

CLAIM: {question}

Option A: {option_a} (TRUE)
Option B: {option_b} (FALSE)

Category: {category}
Previous ruling: {previous_ruling}

Respond using ONLY the following JSON format:
{{"ruling": "A" or "B"}}
Your output must be only JSON without any formatting prefix or suffix."""

        def get_ruling():
            result = gl.nondet.exec_prompt(prompt)
            result = result.replace("```json", "").replace("```", "").strip()
            return result

        result = gl.eq_principle.prompt_comparative(
            get_ruling, "The value of ruling has to match"
        )
        
        try:
            parsed = json.loads(result)
            ruling = parsed.get("ruling", "A").upper()
        except:
            ruling = "A"
        
        if ruling not in ["A", "B"]:
            ruling = "A"
        
        overturned = "true" if ruling != previous_ruling and previous_ruling else "false"
        
        # Store evaluation
        self.evaluation_data[scenario_id] = f"{ruling}|50|appeal"
        
        return f"ruling:{ruling}|validator_count:50|method:appeal_escalated|overturned:{overturned}"

    @gl.public.view
    def get_evaluation(self, scenario_id: str) -> str:
        """Get stored evaluation result."""
        if scenario_id not in self.evaluation_data:
            return "error:no evaluation found"
        data = self.evaluation_data[scenario_id]
        parts = data.split("|")
        ruling = parts[0] if len(parts) > 0 else ""
        count = parts[1] if len(parts) > 1 else "0"
        method = parts[2] if len(parts) > 2 else ""
        return f"ruling:{ruling}|validator_count:{count}|method:{method}"

    @gl.public.view
    def get_stats(self) -> str:
        """Get contract statistics."""
        return f"scenarios:{len(self.scenario_data)}|evaluations:{len(self.evaluation_data)}"
