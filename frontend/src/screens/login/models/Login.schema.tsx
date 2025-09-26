
import * as Yup from 'yup';


const validationSchema = Yup.object().shape({
    username: Yup.string().required().min(4).label('Username'),
    password: Yup.string().required().min(4).label('Password'),
});

export default validationSchema;