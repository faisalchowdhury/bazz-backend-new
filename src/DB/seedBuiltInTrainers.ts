import { UserModel } from "../modules/user/user.model";
import { ITrainer } from "../modules/trainer/trainer.interface";
import { TrainerModel } from "../modules/trainer/trainer.model";
import { CategoryModel } from "../modules/category/category.model";
import { TrainerKnowledgePackModel } from "../modules/trainerKnowledge/trainerKnowledge.model";
import { hashPassword } from "../modules/user/user.utils";
import {
  BUILT_IN_ANAM_PERSONA_ID,
  BUILT_IN_TRAINER_PASSWORD,
  BUILT_IN_TRAINERS,
} from "./builtInTrainers.data";
import { seedStarterExerciseBlockForTrainer } from "./seedBuiltInExerciseBlocks";

export const seedBuiltInTrainers = async () => {
  const hashedPassword = await hashPassword(BUILT_IN_TRAINER_PASSWORD);
  const results: Array<{ slug: string; email: string; trainerId: string }> = [];

  for (const def of BUILT_IN_TRAINERS) {
    let user = await UserModel.findOne({ email: def.email });

    if (!user) {
      user = await UserModel.create({
        firstName: def.firstName,
        lastName: def.lastName,
        email: def.email,
        dateOfBirth: def.dateOfBirth,
        password: hashedPassword,
        gender: def.gender,
        role: "trainer",
        isVerified: true,
        isDeleted: false,
      });
      console.log(`Built-in trainer user created: ${def.email}`);
    } else {
      await UserModel.updateOne(
        { _id: user._id },
        {
          $set: {
            firstName: def.firstName,
            lastName: def.lastName,
            password: hashedPassword,
            gender: def.gender,
            role: "trainer",
            isVerified: true,
            isDeleted: false,
          },
        },
      );
      console.log(`Built-in trainer user updated: ${def.email}`);
    }

    const trainerPayload = {
      userId: user._id,
      name: def.name,
      bio: def.bio,
      certifications: def.certifications,
      specialty: def.specialty,
      trainingStyleTags: def.trainingStyleTags,
      systemPrompt: def.systemPrompt,
      anamAI: {
        personaId: BUILT_IN_ANAM_PERSONA_ID,
        isEnabled: true,
      },
      subscriptionPrice: def.subscriptionPrice,
      subscriberCount: 0,
      isActive: true,
      isVerified: true,
      isBuiltIn: true,
      isDefault: def.isDefault ?? false,
      personaKey: def.personaKey,
      slug: def.slug,
      onboardingGoal: def.onboardingGoal,
      onboardingPriority: def.onboardingPriority,
    };

    let trainer: ITrainer | null = await TrainerModel.findOne({ slug: def.slug });

    if (!trainer) {
      trainer = await TrainerModel.create(trainerPayload);
      console.log(`Built-in trainer profile created: ${def.name}`);
    } else {
      trainer = await TrainerModel.findOneAndUpdate(
        { _id: trainer._id },
        { $set: trainerPayload },
        { new: true },
      );
      console.log(`Built-in trainer profile updated: ${def.name}`);
    }

    if (!trainer) {
      throw new Error(`Failed to upsert trainer profile for ${def.slug}`);
    }

    const trainerId = trainer.id;

    await TrainerKnowledgePackModel.findOneAndUpdate(
      { trainerId },
      { $set: { trainerId, ...def.knowledgePack } },
      { upsert: true, new: true },
    );

    for (const category of def.categories) {
      await CategoryModel.findOneAndUpdate(
        { trainerId, slug: category.slug },
        {
          $set: {
            trainerId,
            category: category.category,
            slug: category.slug,
            description: category.description,
            isActive: true,
          },
        },
        { upsert: true, new: true },
      );
    }

    await seedStarterExerciseBlockForTrainer(trainerId);

    results.push({
      slug: def.slug,
      email: def.email,
      trainerId,
    });
  }

  // Ensure only one default trainer (Gabriel)
  const defaultSlug = BUILT_IN_TRAINERS.find((t) => t.isDefault)?.slug;
  if (defaultSlug) {
    const defaultTrainer = await TrainerModel.findOne({ slug: defaultSlug });
    if (defaultTrainer) {
      await TrainerModel.updateMany(
        { _id: { $ne: defaultTrainer._id } },
        { $set: { isDefault: false } },
      );
      await TrainerModel.updateOne(
        { _id: defaultTrainer._id },
        { $set: { isDefault: true } },
      );
    }
  }

  console.log(`Built-in trainers seeded: ${results.length} total`);
  return results;
};

export default seedBuiltInTrainers;
