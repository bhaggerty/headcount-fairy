function formatSalaryRange(req) {
  const min = Number(req.salary_min);
  const max = Number(req.salary_max);
  if (!min && !max) return 'Not specified';
  if (!max || min === max) return `$${min.toLocaleString()}`;
  return `$${min.toLocaleString()} – $${max.toLocaleString()}`;
}

module.exports = { formatSalaryRange };
