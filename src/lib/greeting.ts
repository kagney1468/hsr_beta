export function getGreeting(firstName: string | null): string {
  const hour = new Date().getHours();
  const timeGreeting =
    hour >= 5 && hour < 12 ? 'Good morning' :
    hour >= 12 && hour < 17 ? 'Good afternoon' : 'Good evening';
  return firstName ? `${timeGreeting}, ${firstName}` : timeGreeting;
}
