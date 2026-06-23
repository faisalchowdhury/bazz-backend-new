import { CommissionModel, CommissionType } from "../modules/admin/admin.model";
import { AboutModel } from "../modules/settings/About/About.model";
import { PrivacyModel } from "../modules/settings/privacy/Privacy.model";
import { TermsModel } from "../modules/settings/Terms/Terms.model";
import { UserModel } from "../modules/user/user.model";
import { hashPassword } from "../modules/user/user.utils";

// const admin = {
//   name: "Mr Wilson",
//   email: "wilson@gmail.com",
//   password: "1qazxsw2",
//   role: "admin",
//   isDeleted: false,
// };
const admin2 = {
  firstName: "Admin",
  lastName: "test",
  email: "admin@gmail.com",
  dateOfBirth: "12/12/1990",
  gender: "not_prefer_to_say",
  password: "1qazxsw2",
  role: "admin",
  isDeleted: false,
  isVerified: true,
};

const dummyPrivacy = {
  description: "dummy privacy and policy",
};
const dummyAbout = {
  description: "dummy about us ",
};
const dummyTerms = {
  description: "dummy terms and conditions",
};

export const seedSuperAdmin = async () => {
  const admins = [admin2];

  for (const adminData of admins) {
    const isAdminExists = await UserModel.findOne({ email: adminData.email });

    if (!isAdminExists) {
      const hashedPassword = await hashPassword(adminData.password);
      const adminWithHashedPassword = {
        ...adminData,
        password: hashedPassword,
      };

      await UserModel.create(adminWithHashedPassword);
      console.log(`Admin created: ${adminData.email}`);
    } else {
      console.log(`Admin already exists: ${adminData.email}`);
    }
  }
};

export const seedPrivacy = async () => {
  const privacy = await PrivacyModel.findOne();
  if (!privacy) {
    await PrivacyModel.create(dummyPrivacy);
  }
};
export const seedTerms = async () => {
  const terms = await TermsModel.findOne();
  if (!terms) {
    await TermsModel.create(dummyTerms);
  }
};
export const seedAbout = async () => {
  const about = await AboutModel.findOne();
  if (!about) {
    await AboutModel.create(dummyAbout);
  }
};
export const seedCommitionRate = async () => {
  const commitionRate = await CommissionModel.findOne();
  if (!commitionRate) {
    await CommissionModel.create({
      commitionType: CommissionType.GLOBAL,
      commitionRate: 10,
    });
  }
};

export { seedBuiltInTrainers } from "./seedBuiltInTrainers";
export default seedSuperAdmin;
