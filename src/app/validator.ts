const validate = (values: Record<string, any>) => {
  Object.keys(values).forEach((key) => {
    if (values[key] === undefined || values[key] === "" || values[key] === null) {
      throw new Error(`${key} 환경변수가 설정되지 않았습니다.`);
    }
  });
};

export default validate;
