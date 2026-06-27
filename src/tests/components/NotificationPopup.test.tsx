
import React from 'react';
import { render, screen, cleanup, act } from '@testing-library/react';
import NotificationPopup, { type Notification } from '../../components/NotificationPopup';
import userEvent from '@testing-library/user-event';

describe('NotificationPopup', () => {
    afterEach(() => {
        cleanup();
        jest.useRealTimers();
    });

    test('renders nothing when notification is null', () => {
        const { container } = render(<NotificationPopup notification={null} onClose={jest.fn()} />);
        expect(container).toBeEmptyDOMElement();
    });

    test('renders success notification correctly', () => {
        const notification: Notification = {
            id: '1',
            type: 'success',
            title: 'Success Title',
            message: 'Success Message'
        };
        render(<NotificationPopup notification={notification} onClose={jest.fn()} />);
        expect(screen.getByText('Success Title')).toBeInTheDocument();
        expect(screen.getByText('Success Message')).toBeInTheDocument();
        const container = screen.getByText('Success Title').closest('.bg-green-50');
        expect(container).toBeInTheDocument();
    });

    test('renders error notification correctly', () => {
        const notification: Notification = {
            id: '2',
            type: 'error',
            title: 'Error Title',
            message: 'Error Message'
        };
        render(<NotificationPopup notification={notification} onClose={jest.fn()} />);
        expect(screen.getByText('Error Title')).toBeInTheDocument();
        const container = screen.getByText('Error Title').closest('.bg-red-50');
        expect(container).toBeInTheDocument();
    });

    test('renders warning notification correctly', () => {
        const notification: Notification = {
            id: '3',
            type: 'warning',
            title: 'Warning Title',
            message: 'Warning Message'
        };
        render(<NotificationPopup notification={notification} onClose={jest.fn()} />);
        expect(screen.getByText('Warning Title')).toBeInTheDocument();
        const container = screen.getByText('Warning Title').closest('.bg-yellow-50');
        expect(container).toBeInTheDocument();
    });

    test('renders info notification correctly', () => {
        const notification: Notification = {
            id: '4',
            type: 'info',
            title: 'Info Title',
            message: 'Info Message'
        };
        render(<NotificationPopup notification={notification} onClose={jest.fn()} />);
        expect(screen.getByText('Info Title')).toBeInTheDocument();
        const container = screen.getByText('Info Title').closest('.bg-blue-50');
        expect(container).toBeInTheDocument();
    });

    test('renders default style for unknown type', () => {
        const notification: Notification = {
            id: '5',
            // @ts-ignore
            type: 'unknown',
            title: 'Unknown Title',
            message: 'Unknown Message'
        };
        render(<NotificationPopup notification={notification} onClose={jest.fn()} />);
        expect(screen.getByText('Unknown Title')).toBeInTheDocument();
        const container = screen.getByText('Unknown Title').closest('.bg-gray-50');
        expect(container).toBeInTheDocument();
    });

    test('auto-closes after duration', () => {
        jest.useFakeTimers();
        const onClose = jest.fn();
        const notification: Notification = {
            id: '1',
            type: 'success',
            title: 'Auto Close',
            message: 'Message',
            duration: 3000
        };

        render(<NotificationPopup notification={notification} onClose={onClose} />);

        act(() => {
            jest.advanceTimersByTime(3000);
        });

        act(() => {
            jest.advanceTimersByTime(300);
        });

        expect(onClose).toHaveBeenCalled();
    });

    test('manual close calls onClose', async () => {
        jest.useFakeTimers();
        const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
        const onClose = jest.fn();
        const notification: Notification = {
            id: '1',
            type: 'success',
            title: 'Manual Close',
            message: 'Message'
        };

        render(<NotificationPopup notification={notification} onClose={onClose} />);

        const closeButton = screen.getByRole('button');
        await user.click(closeButton);

        act(() => {
            jest.advanceTimersByTime(300);
        });

        expect(onClose).toHaveBeenCalled();
    });
});
