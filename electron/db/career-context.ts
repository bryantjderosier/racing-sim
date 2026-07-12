import { careersRoot } from './index.js';
import { defaultMigrationsFolder } from './migrate.js';
import {
	createCareerStore,
	type CareerStore
} from '../sim/career/store.js';

let store = createCareerStore({
	rootDir: careersRoot(),
	migrationsFolder: defaultMigrationsFolder()
});

export function setCareerStoreForTests(next: CareerStore): void {
	store = next;
}

export function getCareerStore(): CareerStore {
	return store;
}
