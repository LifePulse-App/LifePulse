export type ResultSummary = {
    student_info: {
      name: string;
      student_id: string;
    };
    results: {
      [courseName: string]: {
        [category: string]: {
          max_mark: string | number;
          obtained_marks: string | number;
          class_average: string | number;
          percentage: string | number;
          assessment: string;
        }[];
      };
    };
  };
  