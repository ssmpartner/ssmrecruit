ALTER TABLE leads DROP CONSTRAINT leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check CHECK (status = ANY (ARRAY[
  'new', 'contacted', 'callback', 'not_reached', 'not_interested', 'no_need', 'not_suitable', 'internal',
  'appointment', 'interview_1', 'insights', 'interview_2',
  'follow_up', 'ready_for_controlling', 'controlling_approved', 'management_review', 'management_approved', 'hr_processing',
  'hired', 'rejected'
]));