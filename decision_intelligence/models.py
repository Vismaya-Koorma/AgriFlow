from django.db import models
from django.conf import settings


class SimulationHistory(models.Model):
    """tbl_simulation_history — Audit log for saved What-If water scenario simulations."""

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='saved_simulations'
    )
    original_water_liters = models.DecimalField(max_digits=14, decimal_places=2)
    simulated_water_liters = models.DecimalField(max_digits=14, decimal_places=2)
    reduction_percentage = models.DecimalField(max_digits=5, decimal_places=2, help_text="e.g. 10.0, 20.0, 30.0, 50.0")
    total_fields_count = models.IntegerField(default=0)
    affected_fields_count = models.IntegerField(default=0)
    major_affected_field = models.CharField(max_length=255, blank=True, null=True)
    summary = models.TextField(blank=True, null=True)
    action_plan_snapshot = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tbl_simulation_history'
        ordering = ['-created_at']

    def __str__(self):
        return f"Simulation #{self.id} — {self.reduction_percentage}% reduction on {self.created_at.strftime('%Y-%m-%d %H:%M')}"
