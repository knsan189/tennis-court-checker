export const getTargetMonth = () => {
  const date = new Date();
  const thisMonth = date.getMonth() + 1;
  const thisYear = date.getFullYear();
  return [
    { month: thisMonth, year: thisYear },
    {
      month: thisMonth > 11 ? 1 : thisMonth + 1,
      year: thisMonth > 11 ? thisYear + 1 : thisYear
    }
  ];
};
