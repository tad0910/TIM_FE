import { companyApi } from '../../services/companyApi';
import { api } from '../../services/api';

jest.mock('../../services/api', () => ({
    api: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
    },
    BASE_URL: 'http://localhost:8081',
}));

describe('companyApi', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getAll', () => {
        it('calls api.get with correct parameters', async () => {
            const mockResponse = {
                content: [],
                totalElements: 0,
                totalPages: 0,
                size: 10,
                number: 0,
            };
            (api.get as jest.Mock).mockResolvedValue(mockResponse);

            const result = await companyApi.getAll(1, 20);

            expect(api.get).toHaveBeenCalledWith('/api/admin/companies', {
                page: 1,
                size: 20,
            });
            expect(result).toEqual(mockResponse);
        });

        it('uses default parameters if not provided', async () => {
            await companyApi.getAll();

            expect(api.get).toHaveBeenCalledWith('/api/admin/companies', {
                page: 0,
                size: 10,
            });
        });
    });

    describe('getById', () => {
        it('calls api.get with correct url', async () => {
            const mockCompany = { id: 1, name: 'Test Company' };
            (api.get as jest.Mock).mockResolvedValue(mockCompany);

            const result = await companyApi.getById(1);

            expect(api.get).toHaveBeenCalledWith('/api/admin/companies/1');
            expect(result).toEqual(mockCompany);
        });
    });

    describe('create', () => {
        it('calls api.post with correct parameters', async () => {
            const formData = new FormData();
            formData.append('name', 'New Company');

            await companyApi.create(formData);

            expect(api.post).toHaveBeenCalledWith('/api/admin/companies', formData, {});
        });
    });

    describe('update', () => {
        it('calls api.put with correct parameters', async () => {
            const formData = new FormData();
            formData.append('name', 'Updated Company');

            await companyApi.update(1, formData);

            expect(api.put).toHaveBeenCalledWith('/api/admin/companies/1', formData);
        });
    });

    describe('delete', () => {
        it('calls api.delete with correct url', async () => {
            await companyApi.delete(1);

            expect(api.delete).toHaveBeenCalledWith('/api/admin/companies/1');
        });
    });
});
