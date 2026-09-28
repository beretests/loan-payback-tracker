export default function PageTaskBar({ title, tasks }) {
  return (
    <nav className="page-task-bar" aria-label={`${title} available tasks`}>
      <strong className="page-task-bar__label">Available tasks</strong>
      <div className="page-task-bar__links">
        {tasks.map((task) => (
          <a
            className="page-task-link"
            href={`#${task.target}`}
            key={`${task.target}-${task.label}`}
            onClick={task.onSelect}
          >
            <span>{task.label}</span>
            <small>{task.action}</small>
          </a>
        ))}
      </div>
    </nav>
  );
}
