export function generateEmployees(count = 1000) {

  const departments = [
    "Engineering",
    "Finance",
    "HR",
    "Marketing",
    "Sales"
  ];

  const data = [];

  for (let i = 1; i <= count; i++) {

    data.push({
      id: i,
      name: `Employee ${i}`,
      department: departments[i % departments.length],
      salary: Math.floor(Math.random() * 90000) + 30000
    });

  }

  return data;
}