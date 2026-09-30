#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt

python manage.py collectstatic --no-input

python manage.py migrate
python seed_master.py
python seed_users.py
python seed_phase1.py
python seed_crop_varieties.py
python seed_variety_stage_durations.py
