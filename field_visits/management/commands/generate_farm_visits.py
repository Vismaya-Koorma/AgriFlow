from django.core.management.base import BaseCommand
from field_visits.services import generate_scheduled_visits_for_window, mark_missed_visits


class Command(BaseCommand):
    help = 'Generates recurring farm visits for a rolling window (default 4 weeks) and updates missed visits.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--weeks',
            type=int,
            default=4,
            help='Number of weeks ahead to generate scheduled visits for (default: 4)'
        )
        parser.add_argument(
            '--mark-missed',
            action='store_true',
            help='Also mark past uncompleted visits as MISSED'
        )

    def handle(self, *args, **options):
        weeks = options['weeks']
        self.stdout.write(f"Generating farm visits for the next {weeks} weeks...")

        count = generate_scheduled_visits_for_window(weeks_ahead=weeks)
        self.stdout.write(self.style.SUCCESS(f"Successfully generated {count} new farm visits."))

        if options['mark_missed']:
            missed_count = mark_missed_visits()
            self.stdout.write(self.style.WARNING(f"Updated {missed_count} past visits to MISSED status."))
